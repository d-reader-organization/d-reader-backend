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
  fetchCollection,
  fetchAsset,
} from '@metaplex-foundation/mpl-core';
import { umi } from '../utils/metaplex';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { D_READER_FRONTEND_URL, MIN_COMPUTE_PRICE } from '../constants';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { CreatePrintEditionCollectionDto } from './dto/create-print-edition.dto';
import { s3Service } from '../aws/s3.service';
import { AssetType } from '@prisma/client';
import { CreateOneOfOneDto } from './dto/create-one-of-one-dto';
import { CreateOneOfOneCollectionDto } from './dto/create-one-of-one-collection-dto';
import { AttributesDto } from '../auction-house/dto/listing.dto';
import { PrintEditionParams } from './dto/print-edition-params.dto';
import {
  buyEdition,
  findEditionSaleConfigPda,
  findMasterEditionAuthorityPda,
} from 'core-auctions';
import { toMetaplexFile, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { HeliusService } from '../webhooks/helius/helius.service';
import { fetchDigitalAssetOffChainMetadata } from 'src/utils/nft-metadata';
import { imageUrlToS3File } from 'src/utils/files';
import { RoyaltyWalletDto } from 'src/comic-issue/dto/royalty-wallet.dto';

const getS3Folder = (address: string, assetType: AssetType) =>
  `${assetType}/${address}/`;

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
    const assets = await this.prisma.collectibleComic.findMany({
      where: {
        digitalAsset: {
          owner: {
            address: query?.ownerAddress,
            userId: query.userId ? +query.userId : undefined,
          },
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
      include: {
        metadata: { include: { collection: true } },
        digitalAsset: true,
      },
      orderBy: { name: 'asc' },
    });
    return assets;
  }

  async findOne(address: string) {
    const asset = await this.prisma.collectibleComic.findUnique({
      where: { address },
      include: {
        metadata: { include: { collection: true } },
        digitalAsset: {
          include: { listings: { where: { canceledAt: new Date(0) } } },
        },
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

    const files: string[] = [];
    if (cover) {
      const coverFile = toMetaplexFile(image.buffer, 'cover');
      const [coverUri] = await this.umi.uploader.upload([coverFile]);
      files.push(coverUri);
    }

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
      name,
      description,
      image,
      attributes,
      tags,
      genres,
      creators,
      files,
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
    )[0];

    return { transaction: serializedTransaction, address: collectionAddress };
  }

  async createOneOfOneCollection(address: string) {
    /* Save One of One Collection in database */
    const oneOfOneCollection = await this.prisma.oneOfOneCollection.findUnique({
      where: { address },
    });
    const isOneOfOneCollectionAlreadyExists = !!oneOfOneCollection;

    if (!isOneOfOneCollectionAlreadyExists) {
      throw new BadRequestException(
        '1/1 Collection with this address already exists !',
      );
    }

    const collection = await fetchCollection(this.umi, address);
    const authority = collection.updateAuthority.toString();
    const offChainMetadata = await fetchDigitalAssetOffChainMetadata(
      collection.uri,
    );

    const { name, description, properties, attributes, tags, genres } =
      offChainMetadata;
    const royaltyWallets: RoyaltyWalletDto[] = properties.creators.map(
      (creator) => {
        return {
          address: creator.address,
          share: creator.percentage,
        };
      },
    );
    const s3Folder = getS3Folder(address, AssetType.OneOfOneCollection);

    const sellerFeeBasisPoints = collection.royalties?.basisPoints ?? 0;
    const imageFile = await imageUrlToS3File(offChainMetadata.image);
    const image = await this.s3.uploadFile(imageFile, {
      s3Folder,
      fileName: 'image',
      timestamp: false,
    });
    const coverUri = properties.files?.at(0).uri ?? undefined;

    let banner: string;
    if (coverUri) {
      const coverFile = await imageUrlToS3File(coverUri);
      banner = await this.s3.uploadFile(coverFile, {
        s3Folder,
        fileName: 'cover',
        timestamp: false,
      });
    }

    return await this.prisma.oneOfOneCollection.create({
      data: {
        address,
        name,
        description,
        sellerFeeBasisPoints,
        image,
        banner,
        digitalAsset: {
          create: {
            owner: {
              connectOrCreate: {
                where: { address: authority },
                create: { address: authority },
              },
            },
            ownerChangedAt: new Date(),
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
        },
      },
    });
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
    const collection = collectionAddress
      ? { publicKey: publicKey(collectionAddress) }
      : undefined;

    const createAssetBuilder = createAsset(umi, {
      asset,
      name,
      uri,
      collection,
      plugins: collectionAddress ? undefined : plugins,
    });

    const builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    }).add(createAssetBuilder);

    const transaction = await builder.buildAndSign({ ...this.umi, payer });
    const serializedTransaction = base64.deserialize(
      this.umi.transactions.serialize(transaction),
    )[0];

    return serializedTransaction;
  }

  async createOneOfOne(address: string) {
    /* Save One of One in database */
    const oneOfOne = await this.prisma.oneOfOne.findUnique({
      where: { address },
    });
    const isOneOfOneAlreadyExists = !!oneOfOne;

    if (!isOneOfOneAlreadyExists) {
      throw new BadRequestException('1/1 with this address already exists !');
    }

    const asset = await fetchAsset(this.umi, address);
    const authority = asset.owner.toString();
    const offChainMetadata = await fetchDigitalAssetOffChainMetadata(asset.uri);

    const { name, description, properties, attributes, tags, genres, isNSFW } =
      offChainMetadata;
    const royaltyWallets: RoyaltyWalletDto[] = properties.creators.map(
      (creator) => {
        return {
          address: creator.address,
          share: creator.percentage,
        };
      },
    );
    const s3Folder = getS3Folder(address, AssetType.OneOfOne);

    const sellerFeeBasisPoints = asset.royalties?.basisPoints ?? 0;
    const file = await imageUrlToS3File(offChainMetadata.image);
    const image = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: 'image',
      timestamp: false,
    });

    return await this.prisma.oneOfOne.create({
      data: {
        address,
        name,
        description,
        sellerFeeBasisPoints,
        isNSFW,
        image,
        digitalAsset: {
          create: {
            owner: {
              connectOrCreate: {
                where: { address: authority },
                create: { address: authority },
              },
            },
            ownerChangedAt: new Date(),
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
        },
      },
    });
  }

  async createPrintEditionCollectionTransaction(
    createPrintEditionCollectionDto: CreatePrintEditionCollectionDto,
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
    } = createPrintEditionCollectionDto;
    const payer = createNoopSigner(publicKey(authority));

    const creators: CoreCreator[] = [];

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
      name,
      description,
      image,
      attributes,
      tags,
      genres,
      creators,
      [],
    );

    const plugins: CreateCollectionArgsPlugin[] = [
      {
        type: 'Royalties',
        basisPoints: sellerFeeBasisPoints ?? 0,
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

    return {
      transaction: serializedTransaction,
      address: collection.publicKey.toString(),
    };
  }

  async createPrintEditionCollection(address: string) {
    /* Saves print edition collection in database */
    const printEditionCollection =
      await this.prisma.printEditionCollection.findUnique({
        where: { address },
      });
    const isCollectionAlreadyExists = !!printEditionCollection;

    if (!isCollectionAlreadyExists) {
      throw new BadRequestException(
        'Print Edition Collection with this address already exists !',
      );
    }

    const collection = await fetchCollection(this.umi, publicKey(address));
    const authority = collection.updateAuthority;
    const offChainMetadata = await fetchDigitalAssetOffChainMetadata(
      collection.uri,
    );

    const { name, description, properties, attributes, tags, genres, isNSFW } =
      offChainMetadata;
    const royaltyWallets: RoyaltyWalletDto[] = properties.creators.map(
      (creator) => {
        return {
          address: creator.address,
          share: creator.percentage,
        };
      },
    );

    const s3Folder = getS3Folder(address, AssetType.PrintEditionCollection);

    const sellerFeeBasisPoints = collection.royalties?.basisPoints ?? 0;
    const file = await imageUrlToS3File(offChainMetadata.image);
    const image = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: 'image',
      timestamp: false,
    });

    return await this.prisma.printEditionCollection.create({
      data: {
        address,
        name,
        description,
        image,
        isNSFW,
        sellerFeeBasisPoints,
        publishedAt: new Date(),
        digitalAsset: {
          create: {
            owner: {
              connectOrCreate: {
                where: { address: authority },
                create: { address: authority },
              },
            },
            ownerChangedAt: new Date(),
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
        },
      },
    });
  }

  async createBuyPrintEditionTransaction(printEditionDto: PrintEditionParams) {
    /* Mints a pint edition */
    const { buyer, masterEditionAddress } = printEditionDto;
    const { printEditionSaleConfig, digitalAsset } =
      await this.prisma.printEditionCollection.findFirst({
        where: { address: masterEditionAddress },
        include: { printEditionSaleConfig: true, digitalAsset: true },
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
    const seller = publicKey(digitalAsset.ownerAddress);
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
    name: string,
    description: string,
    image: Express.Multer.File,
    attributes: AttributesDto[],
    tags: string[],
    genres: string[],
    creators: CoreCreator[],
    files: string[],
    isNSFW = false,
  ) {
    const imageFile = toMetaplexFile(image.buffer, 'image.png');
    const [imageUri] = await this.umi.uploader.upload([imageFile]);

    const uri = await this.umi.uploader.uploadJson({
      name,
      description,
      image: imageUri,
      attributes,
      tags,
      genres,
      isNSFW,
      external_url: D_READER_FRONTEND_URL,
      properties: {
        creators,
        files,
      },
    });

    return uri;
  }
}
