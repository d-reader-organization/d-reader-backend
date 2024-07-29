import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { DigitalAssetFilterParams } from './dto/digital-asset-params.dto';
import {
  createNoopSigner,
  generateSigner,
  publicKey,
  Umi,
} from '@metaplex-foundation/umi';
import {
  Creator as CoreCreator,
  ruleSet,
  createCollection,
  create as createAsset,
  CreateArgsPlugin,
  CreateCollectionArgsPlugin,
} from '@metaplex-foundation/mpl-core';
import { MetadataFile, umi, writeFiles } from '../utils/metaplex';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { D_READER_FRONTEND_URL, MIN_COMPUTE_PRICE } from '../constants';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { CreateMasterEditionDto } from './dto/create-edition.dto';
import { s3Service } from '../aws/s3.service';
import { AssetType } from '@prisma/client';
import { appendTimestamp } from '../utils/helpers';
import { s3toMxFile } from '../utils/files';
import { CreateOneOfOneDto } from './dto/create-one-of-one-dto';
import { CreateCollectionDto } from './dto/create-collection-dto';
import { AttributesDto } from '../auction-house/dto/listing.dto';
import { PartialGenreDto } from '../genre/dto/partial-genre.dto';
import { PrintEditionParams } from './dto/print-edition-params.dto';
import {
  buyEdition,
  findEditionSaleConfigPda,
  findMasterEditionAuthorityPda,
} from 'core-auctions';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';

const getS3Folder = (name: string, assetType: AssetType) =>
  `${assetType}/${name}/${Date.now()}`;
@Injectable()
export class DigitalAssetService {
  private readonly umi: Umi;
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: s3Service,
  ) {
    this.umi = umi;
  }

  async findAll(query: DigitalAssetFilterParams) {
    const assets = await this.prisma.digitalAsset.findMany({
      where: {
        owner: {
          address: query?.ownerAddress,
          userId: query.userId ? +query.userId : undefined,
        },
        metadata: {
          collection: {
            comicIssue: query.comicIssueId
              ? { id: query.comicIssueId ? +query.comicIssueId : undefined }
              : { comic: { slug: query.comicSlug } },
          },
        },
      },
      skip: query?.skip,
      take: query?.take,
      include: { metadata: { include: { collection: true } } },
      orderBy: { name: 'asc' },
    });
    return assets;
  }

  async findOne(address: string) {
    const asset = await this.prisma.digitalAsset.findUnique({
      where: { address },
      include: {
        metadata: { include: { collection: true } },
        listing: { where: { canceledAt: new Date(0) } },
      },
    });

    if (!asset) {
      throw new NotFoundException(
        `Asset with address ${address} does not exist`,
      );
    }

    return asset;
  }

  async createAssetCollection(createCollectionDto: CreateCollectionDto) {
    /* Creates a collection */
    const {
      name,
      description,
      attributes,
      authority,
      sellerFeeBasisPoints,
      image,
      cover,
      royaltyWallets,
      tags,
      genres,
    } = createCollectionDto;
    const payer = createNoopSigner(publicKey(authority));

    const creators: CoreCreator[] = [];
    royaltyWallets.forEach((wallet) => {
      creators.push({
        address: publicKey(wallet.address),
        percentage: wallet.share,
      });
    });

    const coverS3Folder = getS3Folder(
      appendTimestamp(name),
      AssetType.Collection,
    );
    const coverUri = await this.s3.uploadFile(image, {
      s3Folder: coverS3Folder,
    });
    const coverFile = await s3toMxFile(coverUri);
    const plugins: CreateCollectionArgsPlugin[] = [
      {
        type: 'Royalties',
        basisPoints: sellerFeeBasisPoints,
        creators,
        // Change in future if encounters with a marketplace not enforcing royalties
        ruleSet: ruleSet('None'),
      },
    ];
    const uri = await this.uploadMetadata(
      AssetType.Collection,
      name,
      description,
      image,
      attributes,
      tags,
      genres,
      creators,
      writeFiles(coverFile),
    );
    const collection = generateSigner(umi);
    const createCollectionBuilder = createCollection(umi, {
      collection,
      name,
      uri,
      plugins,
    });

    const builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    }).add(createCollectionBuilder);
    const transaction = await builder.buildAndSign({ ...this.umi, payer });
    const serializedTransaction = base64.deserialize(
      this.umi.transactions.serialize(transaction),
    );
    return serializedTransaction;
  }

  async createOneOfOne(createOneOfOneDto: CreateOneOfOneDto) {
    /* Creates a one of one  */
    const {
      name,
      description,
      attributes,
      authority,
      sellerFeeBasisPoints,
      image,
      tags,
      genres,
      collectionAddress,
      royaltyWallets,
    } = createOneOfOneDto;

    const payer = createNoopSigner(publicKey(authority));

    const creators: CoreCreator[] = [];
    royaltyWallets.forEach((wallet) => {
      creators.push({
        address: publicKey(wallet.address),
        percentage: wallet.share,
      });
    });

    const plugins: CreateArgsPlugin[] = [
      {
        type: 'Royalties',
        basisPoints: sellerFeeBasisPoints,
        creators,
        // Change in future if encounters with a marketplace not enforcing royalties
        ruleSet: ruleSet('None'),
      },
    ];

    const uri = await this.uploadMetadata(
      AssetType.OneOfOne,
      name,
      description,
      image,
      attributes,
      tags,
      genres,
      creators,
      [],
    );
    const asset = generateSigner(umi);
    const createAssetBuilder = createAsset(umi, {
      asset,
      name,
      uri,
      plugins: collectionAddress ? undefined : plugins,
    });
    const builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    }).add(createAssetBuilder);

    const transaction = await builder.buildAndSign({ ...this.umi, payer });
    const serializedTransaction = base64.deserialize(
      this.umi.transactions.serialize(transaction),
    );
    return serializedTransaction;
  }

  async createMasterEditionTransaction(
    createMasterEditionDto: CreateMasterEditionDto,
  ) {
    /* Create a Master edition transaction*/
    const {
      name,
      description,
      sellerFeeBasisPoints,
      authority,
      image,
      attributes,
      tags,
      genres,
      supply,
      royaltyWallets,
    } = createMasterEditionDto;
    const payer = createNoopSigner(publicKey(authority));

    const creators: CoreCreator[] = [];
    royaltyWallets.forEach((wallet) => {
      creators.push({
        address: publicKey(wallet.address),
        percentage: wallet.share,
      });
    });
    const uri = await this.uploadMetadata(
      AssetType.MasterEdition,
      name,
      description,
      image,
      attributes,
      tags,
      genres,
      [],
      creators,
    );

    const plugins: CreateCollectionArgsPlugin[] = [
      {
        type: 'Royalties',
        basisPoints: sellerFeeBasisPoints,
        creators,
        // Change in future if encounters with a marketplace not enforcing royalties
        ruleSet: ruleSet('None'),
      },
      {
        type: 'MasterEdition',
        maxSupply: supply,
        name,
        uri,
      },
    ];

    const collection = generateSigner(umi);
    const createCollectionBuilder = createCollection(umi, {
      collection,
      name,
      uri,
      plugins,
    });

    const builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    }).add(createCollectionBuilder);
    const transaction = await builder.buildAndSign({ ...this.umi, payer });
    const serializedTransaction = base64.deserialize(
      this.umi.transactions.serialize(transaction),
    );
    return serializedTransaction;
  }

  async createMasterEdition(createMasterEditionDto: CreateMasterEditionDto) {
    /* Saves master edition in database */
  }

  async createBuyPrintEditionTransaction(printEditionDto: PrintEditionParams) {
    /* Prints a edition */
    const { buyer, masterEditionAddress } = printEditionDto;
    const { masterEditionSaleConfig, ...masterEdition } =
      await this.prisma.masterEdition.findFirst({
        where: { address: masterEditionAddress },
        include: { masterEditionSaleConfig: true },
      });

    // Add checks for print edition
    if (!masterEditionSaleConfig.isListed) {
      throw new BadRequestException('Edition is not listed for sale');
    }

    const now = new Date(Date.now());
    if (masterEditionSaleConfig.startDate > now) {
      throw new BadRequestException('Edition sale has not started');
    }

    if (masterEditionSaleConfig.endDate < now) {
      throw new BadRequestException('Edition sale has ended');
    }

    const currencyMint = publicKey(masterEditionSaleConfig.currencyMint);
    const collection = publicKey(masterEditionAddress);
    const buyerPubkey = publicKey(buyer);
    const signer = createNoopSigner(buyerPubkey);
    const paymentAccount =
      masterEditionSaleConfig.currencyMint === WRAPPED_SOL_MINT.toString()
        ? buyerPubkey
        : findAssociatedTokenPda(this.umi, {
            mint: publicKey(masterEditionSaleConfig.currencyMint),
            owner: buyerPubkey,
          });
    const masterEditionAuthority = findMasterEditionAuthorityPda(this.umi, {
      collection,
    });
    const editionSaleConfig = findEditionSaleConfigPda(this.umi, {
      collection,
    });
    const edition = generateSigner(this.umi);
    const seller = publicKey(masterEdition.owner);
    const sellerPaymentReciept =
      masterEditionSaleConfig.currencyMint === WRAPPED_SOL_MINT.toString()
        ? seller
        : findAssociatedTokenPda(this.umi, {
            mint: publicKey(masterEditionSaleConfig.currencyMint),
            owner: seller,
          });

    const transaction = await buyEdition(this.umi, {
      buyer: signer,
      paymentAccount,
      masterEditionAuthority,
      editionSaleConfig,
      edition,
      collection,
      seller,
      currencyMint,
      sellerPaymentReciept,
    }).buildAndSign({ ...this.umi, payer: signer });

    const serializedTransaction = base64.deserialize(
      this.umi.transactions.serialize(transaction),
    );
    return serializedTransaction;
  }

  async uploadMetadata(
    assetType: AssetType,
    name: string,
    description: string,
    image: Express.Multer.File,
    attributes: AttributesDto[],
    tags: string[],
    genres: PartialGenreDto[],
    creators: CoreCreator[],
    files: MetadataFile[],
  ) {
    const imageS3Folder = getS3Folder(appendTimestamp(name), assetType);
    const imageUri = await this.s3.uploadFile(image, {
      s3Folder: imageS3Folder,
    });

    const imageFile = await s3toMxFile(imageUri);
    const uri = await this.umi.uploader.uploadJson({
      name,
      description,
      image: imageUri,
      attributes,
      tags,
      genres,
      external_url: D_READER_FRONTEND_URL,
      properties: {
        creators,
        files: [...files, writeFiles(imageFile)],
      },
    });

    return uri;
  }
}
