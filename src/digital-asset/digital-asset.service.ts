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
import {
  CreatePrintEditionCollectionBodyDto,
  CreatePrintEditionCollectionDto,
} from './dto/create-edition.dto';
import { s3Service } from '../aws/s3.service';
import { AssetType } from '@prisma/client';
import { appendTimestamp } from '../utils/helpers';
import { s3toMxFile } from '../utils/files';
import { CreateOneOfOneDto } from './dto/create-one-of-one-dto';
import { CreateOneOfOneCollectionDto } from './dto/create-collection-dto';
import { AttributesDto } from '../auction-house/dto/listing.dto';
import { PrintEditionParams } from './dto/print-edition-params.dto';
import {
  buyEdition,
  findEditionSaleConfigPda,
  findMasterEditionAuthorityPda,
} from 'core-auctions';
import { toMetaplexFile, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { HeliusService } from '../webhooks/helius/helius.service';

const getS3Folder = (
  address: string,
  assetType: AssetType,
  fileType: 'image' | 'cover',
) => `${assetType}/${address}/${fileType}`;
@Injectable()
export class DigitalAssetService {
  private readonly umi: Umi;
  constructor(
    private readonly prisma: PrismaService,
    private readonly helius: HeliusService,
    private readonly s3: s3Service,
  ) {
    this.umi = umi;
  }

  async findAll(query: DigitalAssetFilterParams) {
    const assets = await this.prisma.collectibeComic.findMany({
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
    const asset = await this.prisma.collectibeComic.findUnique({
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

  async createOneOfOneCollectionTransaction(
    createCollectionDto: CreateOneOfOneCollectionDto,
  ) {
    /* Creates a one of one collection transaction */
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

    const collection = generateSigner(umi);
    const collectionAddress = collection.publicKey.toString();

    const coverS3Folder = getS3Folder(
      collectionAddress,
      AssetType.OneOfOneCollection,
      'cover',
    );

    const coverUri = await this.s3.uploadFile(cover, {
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
      AssetType.OneOfOneCollection,
      collectionAddress,
      name,
      description,
      image,
      attributes,
      tags,
      genres,
      creators,
      writeFiles(coverFile),
    );

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

  async createOneOfOneTransaction(createOneOfOneDto: CreateOneOfOneDto) {
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
      collectionAddress,
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

  async createPrintEditionCollectionTransaction(
    createMasterEditionDto: CreatePrintEditionCollectionDto,
  ) {
    /* Create a Master edition transaction*/
    const {
      name,
      description,
      sellerFeeBasisPoints,
      authority,
      attributes,
      tags,
      genres,
      image,
      supply,
      royaltyWallets,
    } = createMasterEditionDto;
    const payer = createNoopSigner(publicKey(authority));

    const creators: CoreCreator[] = [
      {
        address: this.umi.identity.publicKey,
        percentage: 100,
      },
    ];

    if (royaltyWallets) {
      royaltyWallets.forEach((wallet) => {
        creators.push({
          address: publicKey(wallet.address),
          percentage: wallet.share,
        });
      });
    }

    const collection = generateSigner(umi);
    const uri = await this.uploadMetadata(
      AssetType.PrintEditionCollection,
      collection.publicKey.toString(),
      name,
      description,
      image,
      attributes,
      tags,
      genres,
      creators,
      [],
    );

    console.log(uri);
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
    )[0];

    return serializedTransaction;
  }

  async createPrintEditionCollection(
    address: string,
    createMasterEditionDto: CreatePrintEditionCollectionDto,
  ) {
    /* Saves print edition collection in database using helius webhook*/
    const {
      name,
      description,
      sellerFeeBasisPoints,
      authority,
      attributes,
      tags,
      genres,
      isNSFW,
      image,
      royaltyWallets,
    } = createMasterEditionDto;

    const s3Folder = getS3Folder(
      address,
      AssetType.OneOfOneCollection,
      'image',
    );
    const imageKey = await this.s3.uploadFile(image, { s3Folder });

    await this.prisma.printEditionCollection.create({
      data: {
        address,
        name,
        description,
        image: imageKey,
        isNSFW,
        sellerFeeBasisPoints,
        owner: authority,
        royaltyWallets: { createMany: { data: royaltyWallets } },
        tags: { createMany: { data: tags.map((tag) => ({ value: tag })) } },
        traits: {
          createMany: {
            data: attributes.map((attribute) => ({
              name: attribute.trait_type,
              value: attribute.value,
            })),
          },
        },
        genres: { connect: genres.map((slug) => ({ slug })) },
      },
    });
  }

  async createBuyPrintEditionTransaction(printEditionDto: PrintEditionParams) {
    /* Mints a pint edition */
    const { buyer, masterEditionAddress } = printEditionDto;
    const { printEditionSaleConfig, ...masterEdition } =
      await this.prisma.printEditionCollection.findFirst({
        where: { address: masterEditionAddress },
        include: { printEditionSaleConfig: true },
      });

    // Add checks for print edition
    if (!printEditionSaleConfig.isActive) {
      throw new BadRequestException('Edition is not listed for sale');
    }

    const now = new Date(Date.now());
    if (printEditionSaleConfig.startDate > now) {
      throw new BadRequestException('Edition sale has not started');
    }

    if (printEditionSaleConfig.endDate < now) {
      throw new BadRequestException('Edition sale has ended');
    }

    const currencyMint = publicKey(printEditionSaleConfig.currencyMint);
    const collection = publicKey(masterEditionAddress);
    const buyerPubkey = publicKey(buyer);
    const signer = createNoopSigner(buyerPubkey);

    const paymentAccount =
      printEditionSaleConfig.currencyMint === WRAPPED_SOL_MINT.toString()
        ? buyerPubkey
        : findAssociatedTokenPda(this.umi, {
            mint: publicKey(printEditionSaleConfig.currencyMint),
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
      printEditionSaleConfig.currencyMint === WRAPPED_SOL_MINT.toString()
        ? seller
        : findAssociatedTokenPda(this.umi, {
            mint: publicKey(printEditionSaleConfig.currencyMint),
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
    )[0];
    return serializedTransaction;
  }

  async uploadMetadata(
    assetType: AssetType,
    assetAddress: string,
    name: string,
    description: string,
    image: Express.Multer.File,
    attributes: AttributesDto[],
    tags: string[],
    genres: string[],
    creators: CoreCreator[],
    files: MetadataFile[],
  ) {
    const imageS3Folder = getS3Folder(assetAddress, assetType, 'image');
    const imageFile = toMetaplexFile(image.buffer, imageS3Folder);
    const [imageUri] = await this.umi.uploader.upload([imageFile]);

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
        files,
      },
    });

    return uri;
  }
}
