import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CollectibleComicFilterParams } from './dto/digital-asset-params.dto';
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
import { getConnection, getIrysUri, umi } from '../utils/metaplex';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import {
  D_READER_FRONTEND_URL,
  D_READER_SYMBOL,
  MIN_COMPUTE_PRICE,
} from '../constants';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { CreatePrintEditionCollectionDto } from './dto/create-print-edition.dto';
import { s3Service } from '../aws/s3.service';
import { CreateOneOfOneDto } from './dto/create-one-of-one.dto';
import { CreateOneOfOneCollectionDto } from './dto/create-one-of-one-collection.dto';
import { PrintEditionParams } from './dto/print-edition-params.dto';
import {
  buyEdition,
  findEditionSaleConfigPda,
  findMasterEditionAuthorityPda,
} from 'core-auctions';
import { toMetaplexFile, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { HeliusService } from '../webhooks/helius/helius.service';
import { fetchDigitalAssetOffChainMetadata } from '../utils/nft-metadata';
import { imageUrlToS3File } from '../utils/files';
import { RoyaltyWalletDto } from '../comic-issue/dto/royalty-wallet.dto';
import { DigitalAssetCreateTransactionDto } from './dto/digital-asset-transaction.dto';
import { DigitalAssetJsonMetadata } from './dto/types';
import { AssetType } from '../types/assetType';
import { isEmpty, kebabCase } from 'lodash';
import { DAS } from 'helius-sdk';
import {
  CandyMachine,
  CandyMachineReceipt,
  TokenStandard,
} from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getAssetsByGroup } from '../utils/das';
import { Connection } from '@solana/web3.js';
import { AddressLookupTableAccount } from '@solana/web3.js';
import { TransactionMessage } from '@solana/web3.js';
import { MPL_CORE_CANDY_GUARD_PROGRAM_ID } from '@metaplex-foundation/mpl-core-candy-machine';
import { ERROR_MESSAGES } from '../utils/errors';
import { TraitDto } from './dto/trait.dto';
import { CollectibleComicRarityStatsInput } from './dto/collectible-comic-rarity-stats.dto';
import { CollectibleComicInput } from './dto/collectible-comic.dto';
import { PrintEditionInput } from './dto/print-edition.dto';
import { OneOfOneInput } from './dto/one-of-one.dto';
import { DigitalAssetInput } from './dto/digital-asset.dto';

const getS3Folder = (address: string, assetType: AssetType) =>
  `${kebabCase(assetType)}/${address}/`;

@Injectable()
export class DigitalAssetService {
  private readonly umi: Umi;
  private readonly connection: Connection;

  constructor(
    private readonly prisma: PrismaService,
    private readonly helius: HeliusService,
    private readonly s3: s3Service,
  ) {
    this.umi = umi;
    this.connection = getConnection();
  }

  async findAll(query: CollectibleComicFilterParams) {
    const assets = await this.prisma.collectibleComic.findMany({
      where: {
        digitalAsset: {
          owner: {
            address: query?.ownerAddress,
            userId: query.userId ? +query.userId : undefined,
          },
          isBurned: false,
        },
        metadata: {
          collectionAddress: query.collectionAddress,
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
        metadata: {
          include: {
            collection: {
              include: { comicIssue: { include: { statefulCovers: true } } },
            },
          },
        },
        digitalAsset: true,
      },
      orderBy: { name: 'asc' },
    });
    return assets;
  }

  async findAllCollectibleComics(
    query: CollectibleComicFilterParams,
  ): Promise<CollectibleComicInput[]> {
    const collectibleComics = await this.prisma.collectibleComic.findMany({
      where: {
        digitalAsset: {
          owner: {
            address: query?.ownerAddress,
            userId: query.userId ? +query.userId : undefined,
          },
          isBurned: false,
        },
        metadata: {
          collectionAddress: query.collectionAddress,
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
        metadata: {
          include: {
            collection: {
              include: {
                comicIssue: {
                  include: {
                    statefulCovers: true,
                    comic: { select: { title: true } },
                  },
                },
              },
            },
          },
        },
        digitalAsset: true,
      },
      orderBy: { name: 'asc' },
    });

    return collectibleComics.map((collectibleComic) => {
      const collection = collectibleComic.metadata.collection;
      return {
        ...collectibleComic,
        collection,
        statefulCovers: collection.comicIssue.statefulCovers,
        comicIssueName: collection.comicIssue.title,
        comicName: collection.comicIssue.comic.title,
      };
    });
  }

  async findOneCollectibleComic(
    address: string,
  ): Promise<CollectibleComicInput> {
    const collectibleComic = await this.prisma.collectibleComic.findUnique({
      where: { address },
      include: {
        metadata: {
          include: {
            collection: {
              include: {
                comicIssue: {
                  include: {
                    statefulCovers: true,
                    comic: { select: { title: true } },
                  },
                },
              },
            },
          },
        },
        digitalAsset: true,
      },
    });

    const collection = collectibleComic.metadata.collection;
    return {
      ...collectibleComic,
      collection,
      statefulCovers: collection.comicIssue.statefulCovers,
      comicIssueName: collection.comicIssue.title,
      comicName: collection.comicIssue.comic.title,
    };
  }

  async findOnePrintEdition(address: string): Promise<PrintEditionInput> {
    const printEdition = await this.prisma.printEdition.findUnique({
      where: { address },
      include: {
        printEditionCollection: true,
        digitalAsset: {
          include: { tags: true, traits: true, genres: true },
        },
      },
    });

    const { genres, tags, traits, ...digitalAsset } = printEdition.digitalAsset;

    return {
      ...printEdition,
      digitalAsset,
      genres,
      tags,
      traits,
    };
  }

  async findSingleOneOfOne(address: string): Promise<OneOfOneInput> {
    const oneOfOne = await this.prisma.oneOfOne.findUnique({
      where: { address },
      include: {
        digitalAsset: {
          include: { tags: true, traits: true, genres: true },
        },
      },
    });

    const { genres, tags, traits, ...digitalAsset } = oneOfOne.digitalAsset;

    return {
      ...oneOfOne,
      digitalAsset,
      genres,
      tags,
      traits,
    };
  }

  async findOne(address: string): Promise<DigitalAssetInput> {
    const asset = await this.prisma.digitalAsset.findUnique({
      where: { address },
      include: {
        collectibleComic: {
          include: {
            metadata: {
              include: {
                collection: {
                  include: {
                    comicIssue: { include: { statefulCovers: true } },
                  },
                },
              },
            },
          },
        },
        printEdition: { include: { printEditionCollection: true } },
        oneOfOne: true,
        tags: true,
        traits: true,
        genres: true,
      },
    });

    if (!asset) {
      throw new NotFoundException(ERROR_MESSAGES.ASSET_NOT_FOUND(address));
    }
    return {
      ...asset,
      collectibleComic: asset.collectibleComic
        ? {
            ...asset.collectibleComic,
            collection: asset.collectibleComic.metadata.collection,
            statefulCovers:
              asset.collectibleComic.metadata.collection.comicIssue
                .statefulCovers,
            comicIssueName:
              asset.collectibleComic.metadata.collection.comicIssue.title,
          }
        : undefined,
    };
  }

  async findCollectibleComicRarityStats(
    collectionAddress: string,
  ): Promise<CollectibleComicRarityStatsInput[]> {
    const statelessCovers = await this.prisma.statelessCover.findMany({
      where: {
        comicIssue: {
          collectibleComicCollection: { address: collectionAddress },
        },
      },
    });

    const stats = await Promise.all(
      statelessCovers.map(
        async ({
          rarity,
          image,
        }): Promise<CollectibleComicRarityStatsInput> => {
          const used = await this.prisma.collectibleComic.count({
            where: { metadata: { isUsed: true, collectionAddress, rarity } },
          });
          const signed = await this.prisma.collectibleComic.count({
            where: { metadata: { isSigned: true, collectionAddress, rarity } },
          });

          return {
            used,
            signed,
            image,
            rarity,
          };
        },
      ),
    );

    return stats;
  }

  async createOneOfOneCollectionTransaction(
    createCollectionDto: CreateOneOfOneCollectionDto,
  ): Promise<DigitalAssetCreateTransactionDto> {
    /* Creates a one of one collection transaction */
    const {
      name,
      description,
      traits,
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

    const files: DigitalAssetJsonMetadata['properties']['files'] = [];
    if (cover) {
      const coverFile = toMetaplexFile(image.buffer, 'cover');
      const [coverUri] = await this.umi.uploader.upload([coverFile]);
      files.push({ name: 'cover', type: 'img/png', uri: coverUri });
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
      traits,
      tags,
      genres,
      creators,
      files,
    );

    const createCollectionBuilder = createCollection(umi, {
      collection,
      name,
      updateAuthority: payer.publicKey,
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
      digitalAssetAddress: collectionAddress,
    };
  }

  async createOneOfOneCollection(address: string) {
    /* Save One of One Collection in database */
    const oneOfOneCollection = await this.prisma.oneOfOneCollection.findUnique({
      where: { address },
    });
    const isOneOfOneCollectionAlreadyExists = !!oneOfOneCollection;

    if (isOneOfOneCollectionAlreadyExists) {
      throw new BadRequestException(ERROR_MESSAGES.COLLECTION_ALREADY_EXISTS);
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

    const cover = properties.files?.find((file) => file.name === 'cover');
    let banner: string;
    if (cover) {
      const coverFile = await imageUrlToS3File(cover.uri);
      banner = await this.s3.uploadFile(coverFile, {
        s3Folder,
        fileName: 'cover',
        timestamp: false,
      });
    }

    try {
      await this.helius.subscribeTo(address);
      return await this.prisma.oneOfOneCollection.create({
        data: {
          name,
          description,
          sellerFeeBasisPoints,
          image,
          banner,
          digitalAsset: {
            create: {
              address,
              owner: {
                connectOrCreate: {
                  where: { address: authority },
                  create: { address: authority },
                },
              },
              ownerChangedAt: new Date(),
              royaltyWallets: { createMany: { data: royaltyWallets } },
              tags: {
                createMany: { data: tags.map((tag) => ({ value: tag })) },
              },
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
    } catch (e) {
      console.error(e);
    }
  }

  async createOneOfOneTransaction(
    createOneOfOneDto: CreateOneOfOneDto,
  ): Promise<DigitalAssetCreateTransactionDto> {
    /* Creates a one of one  */
    const {
      name,
      description,
      traits,
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
      traits,
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
      owner: payer.publicKey,
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

    return {
      transaction: serializedTransaction,
      digitalAssetAddress: asset.publicKey.toString(),
    };
  }

  async createOneOfOne(address: string) {
    /* Save One of One in database */
    const oneOfOne = await this.prisma.oneOfOne.findUnique({
      where: { address },
    });
    const isOneOfOneAlreadyExists = !!oneOfOne;

    if (isOneOfOneAlreadyExists) {
      throw new BadRequestException(ERROR_MESSAGES.ONE_OF_ONE_ALREADY_EXISTS);
    }

    const asset = await fetchAsset(this.umi, address);
    const authority = asset.owner.toString();
    const offChainMetadata = await fetchDigitalAssetOffChainMetadata(asset.uri);
    const updateAuthority = asset.updateAuthority;
    const doesCollectionExists = updateAuthority.type === 'Collection';
    const collectionAddress = doesCollectionExists
      ? updateAuthority.address.toString()
      : undefined;

    const { name, description, properties, attributes, tags, genres, isNSFW } =
      offChainMetadata;

    const royaltyWallets: RoyaltyWalletDto[] = doesCollectionExists
      ? undefined
      : properties.creators.map((creator) => {
          return {
            address: creator.address,
            share: creator.percentage,
          };
        });

    const s3Folder = getS3Folder(address, AssetType.OneOfOne);
    const sellerFeeBasisPoints = asset.royalties?.basisPoints ?? 0;
    const file = await imageUrlToS3File(offChainMetadata.image);
    const image = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: 'image',
      timestamp: false,
    });

    try {
      await this.helius.subscribeTo(address);
      return await this.prisma.oneOfOne.create({
        data: {
          name,
          description,
          sellerFeeBasisPoints,
          isNSFW,
          image,
          collection: doesCollectionExists
            ? {
                connect: { address: collectionAddress },
              }
            : undefined,
          digitalAsset: {
            create: {
              address,
              owner: {
                connectOrCreate: {
                  where: { address: authority },
                  create: { address: authority },
                },
              },
              ownerChangedAt: new Date(),
              royaltyWallets: doesCollectionExists
                ? undefined
                : { createMany: { data: royaltyWallets } },
              tags: {
                createMany: { data: tags.map((tag) => ({ value: tag })) },
              },
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
    } catch (e) {
      console.error(e);
    }
  }

  async createPrintEditionCollectionTransaction(
    createPrintEditionCollectionDto: CreatePrintEditionCollectionDto,
  ): Promise<DigitalAssetCreateTransactionDto> {
    /* Create a Master edition transaction*/
    const {
      name,
      description,
      sellerFeeBasisPoints,
      authority,
      traits,
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
      traits,
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
      updateAuthority: payer.publicKey,
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
      digitalAssetAddress: collection.publicKey.toString(),
    };
  }

  async createPrintEditionCollection(address: string) {
    /* Saves print edition collection in database */
    const printEditionCollection =
      await this.prisma.printEditionCollection.findUnique({
        where: { address },
      });
    const isCollectionAlreadyExists = !!printEditionCollection;

    if (isCollectionAlreadyExists) {
      throw new BadRequestException(
        ERROR_MESSAGES.PRINT_EDITION_COLLECTION_ALREADY_EXISTS,
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

    try {
      await this.helius.subscribeTo(address);
      return await this.prisma.printEditionCollection.create({
        data: {
          name,
          description,
          image,
          isNSFW,
          sellerFeeBasisPoints,
          digitalAsset: {
            create: {
              address,
              owner: {
                connectOrCreate: {
                  where: { address: authority },
                  create: { address: authority },
                },
              },
              ownerChangedAt: new Date(),
              royaltyWallets: { createMany: { data: royaltyWallets } },
              tags: {
                createMany: { data: tags.map((tag) => ({ value: tag })) },
              },
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
    } catch (e) {
      console.error(e);
    }
  }

  //todo: handle sponsored eiditons sale
  async createBuyPrintEditionTransaction(printEditionDto: PrintEditionParams) {
    /* Mints a pint edition */
    const { buyer, masterEditionAddress } = printEditionDto;
    const { printEditionSaleConfig, digitalAsset } =
      await this.prisma.printEditionCollection.findFirst({
        where: { address: masterEditionAddress },
        include: { printEditionSaleConfig: true, digitalAsset: true },
      });

    if (!printEditionSaleConfig.isActive) {
      throw new BadRequestException(ERROR_MESSAGES.EDITION_NOT_LISTED);
    }

    const now = new Date(Date.now());
    if (printEditionSaleConfig.startDate > now) {
      throw new BadRequestException(ERROR_MESSAGES.EDITION_SALE_NOT_STARTED);
    }

    if (printEditionSaleConfig.endDate < now) {
      throw new BadRequestException(ERROR_MESSAGES.EDITION_SALE_ENDED);
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
    traits: TraitDto[],
    tags: string[],
    genres: string[],
    creators: CoreCreator[],
    files: DigitalAssetJsonMetadata['properties']['files'],
    isNSFW = false,
  ) {
    const imageFile = toMetaplexFile(image.buffer, 'image.png');
    const [imageUri] = await this.umi.uploader.upload([imageFile]);

    const jsonMetadata: DigitalAssetJsonMetadata = {
      name,
      symbol: D_READER_SYMBOL,
      description,
      image: getIrysUri(imageUri),
      attributes: traits.map((trait) => ({
        trait_type: trait.name,
        value: trait.value,
      })),
      tags,
      genres,
      isNSFW,
      external_url: D_READER_FRONTEND_URL,
      properties: {
        creators,
        files,
      },
    };

    const uri = await this.umi.uploader.uploadJson(jsonMetadata);

    return getIrysUri(uri);
  }

  // TODO: sync other digital assets besides collectible comics
  @Cron(CronExpression.EVERY_WEEK)
  protected async syncAllAssets() {
    console.log('Starting Cron job to sync all the assets!');

    await this.syncCollectibleComicMintReceipts();
    await this.findAndSyncAllCollectibleComicCollections();

    console.log('All assets are synced!');
  }

  async findAndSyncAllCollectibleComicCollections() {
    console.log('Starting to sync collectible comics');

    const collections = await this.prisma.collectibleComicCollection.findMany({
      where: { candyMachines: { some: { standard: TokenStandard.Core } } },
    });

    for await (const collection of collections) {
      await this.fetchAssetsAndSync(collection.address);
    }
  }

  async fetchAssetsAndSync(collectionAddress: string) {
    const limit = 1000;
    let page = 1;
    let data = await getAssetsByGroup(collectionAddress, page, limit);

    const syncedAssets = await this.prisma.collectibleComic.findMany({
      where: { metadata: { collectionAddress } },
      include: { digitalAsset: true },
    });

    let syncedItems = 0;
    while (!isEmpty(data)) {
      const unsyncedNfts = data.filter((asset) => {
        const dbAsset = syncedAssets.find((item) => item.address === asset.id);
        if (!dbAsset) {
          this.helius.subscribeTo(asset.id);
        }
        return !(
          dbAsset &&
          dbAsset.digitalAsset.ownerAddress == asset.ownership.owner &&
          dbAsset.uri === asset.content.json_uri
        );
      });

      console.log(`Syncing ${unsyncedNfts.length} assets...!`);
      const promises = unsyncedNfts.map((asset) =>
        this.syncDigitalAssets(asset, collectionAddress),
      );
      await Promise.all(promises);

      page++;
      data = await getAssetsByGroup(collectionAddress, page, limit);
      syncedItems += unsyncedNfts.length;
      console.log(`Synced ${syncedItems} items`);
    }
  }

  async syncDigitalAssets(
    asset: DAS.GetAssetResponse,
    collectionAddress: string,
  ) {
    const candyMachineReceipt = await this.prisma.candyMachineReceipt.findFirst(
      {
        where: { collectibleComics: { some: { address: asset.id } } },
      },
    );

    const doesReceiptExists = !!candyMachineReceipt;
    let candyMachineAddress: string;

    if (doesReceiptExists) {
      candyMachineAddress = candyMachineReceipt.candyMachineAddress;
    } else {
      const candyMachine = await this.prisma.candyMachine.findFirst({
        where: { collectionAddress },
      });

      if (!candyMachine) {
        throw Error(ERROR_MESSAGES.COLLECTION_DOES_NOT_EXIST);
      }
    }
    await this.helius.reIndexAsset(asset, candyMachineAddress);
  }

  async syncCollectibleComicMintReceipts() {
    console.log('Starting to sync mint receipts');

    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: {
        OR: [
          { status: 'Processing' },
          {
            status: 'Processing',
            collectibleComics: {
              none: {},
            },
          },
        ],
      },
      include: { candyMachine: true },
    });

    for await (const receipt of receipts) {
      await this.fetchAndIndexFromReceiptTransaction(receipt);
    }
  }

  async fetchAndIndexFromReceiptTransaction(
    receipt: CandyMachineReceipt & { candyMachine: CandyMachine },
  ) {
    try {
      const { transactionSignature, candyMachineAddress, id, candyMachine } =
        receipt;

      const transactionStatus = await this.connection.getSignatureStatuses(
        [transactionSignature],
        {
          searchTransactionHistory: true,
        },
      );

      if (!transactionStatus || !transactionStatus?.value[0]) {
        await this.prisma.candyMachineReceipt.update({
          where: { id: receipt.id },
          data: { status: 'Failed' },
        });
        return;
      }

      const isTransactionConfirmed =
        transactionStatus.value[0] &&
        (transactionStatus.value[0].confirmationStatus === 'confirmed' ||
          transactionStatus.value[0].confirmationStatus === 'finalized');
      if (isTransactionConfirmed) {
        console.log('Syncing receipt :', id);

        const response = await this.connection.getTransaction(
          transactionSignature,
          { maxSupportedTransactionVersion: 0 },
        );

        if (response.meta.err) {
          return this.prisma.candyMachineReceipt.update({
            where: { id },
            data: { status: 'Failed' },
          });
        } else {
          const transactionMessage = response.transaction.message;
          let lookupTableAccounts: AddressLookupTableAccount;

          if (transactionMessage.addressTableLookups.length) {
            const lookupTableAddress =
              transactionMessage.addressTableLookups[0].accountKey;

            const lookupTable = await this.connection.getAddressLookupTable(
              lookupTableAddress,
            );
            lookupTableAccounts = lookupTable.value;
          }

          const decompiledTransaction = TransactionMessage.decompile(
            response.transaction.message,
            { addressLookupTableAccounts: [lookupTableAccounts] },
          );

          const reIndexAsset = this.indexAssetsFromTransaction(
            decompiledTransaction,
            candyMachineAddress,
            candyMachine.collectionAddress,
            id,
          );

          const updatedReceipt = this.prisma.candyMachineReceipt.update({
            where: { id: receipt.id },
            data: { status: 'Confirmed' },
          });
          return Promise.all([reIndexAsset, updatedReceipt]);
        }
      }
    } catch (e) {
      console.error(ERROR_MESSAGES.ERROR_SYNCING_RECEIPT(receipt.id), e);
    }
  }

  async indexAssetsFromTransaction(
    transaction: TransactionMessage,
    candyMachineAddress: string,
    collectionAddress: string,
    receiptId: number,
  ) {
    const assetAccounts: string[] = [];

    transaction.instructions.forEach((instruction) => {
      const isMintInstruction =
        instruction.programId.toString() ===
        MPL_CORE_CANDY_GUARD_PROGRAM_ID.toString();

      if (isMintInstruction) {
        const { pubkey } = instruction.keys.at(7);
        assetAccounts.push(pubkey.toString());
      }
    });

    try {
      await this.helius.indexCoreAssets(
        assetAccounts,
        candyMachineAddress,
        collectionAddress,
        receiptId,
      );
    } catch (e) {
      console.error(e);
    }
  }
}
