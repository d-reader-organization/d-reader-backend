import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  Metaplex,
  toBigNumber,
  TransactionBuilder,
  MetaplexFile,
} from '@metaplex-foundation/js';
import { ComicIssue } from '@prisma/client';
import { s3toMxFile } from '../utils/files';
import { constructMintInstruction } from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import { chunk } from 'lodash';
import * as bs58 from 'bs58';
import {
  MAX_METADATA_LEN,
  CREATOR_ARRAY_START,
  D_PUBLISHER_SYMBOL,
  HUNDRED,
  HUNDRED_PERCENT_TAX,
  D_READER_FRONTEND_URL,
  USED_TRAIT,
  DEFAULT_COMIC_ISSUE_USED,
  SIGNED_TRAIT,
  DEFAULT_COMIC_ISSUE_IS_SIGNED,
  FIVE_RARITIES_SHARE,
  THREE_RARITIES_SHARE,
} from '../constants';
import { solFromLamports } from '../utils/helpers';
import { initMetaplex } from '../utils/metaplex';
import { ComicRarity, StateFulCover } from '@prisma/client';
import { CandyMachineIssue, RarityConstant } from '../comic-issue/dto/types';

@Injectable()
export class CandyMachineService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {
    this.metaplex = initMetaplex();
  }

  async findMintedNfts(candyMachineAddress: string) {
    try {
      const candyMachineId = new PublicKey(candyMachineAddress);
      const candyMachineCreator = PublicKey.findProgramAddressSync(
        [Buffer.from('candy_machine'), candyMachineId.toBuffer()],
        this.metaplex.programs().getCandyMachine().address,
      );

      const mints = await this.getMintAddresses(candyMachineCreator[0]);
      return mints;
    } catch (e) {
      console.log('error', e);
    }
  }

  async getMintAddresses(firstCreatorAddress: PublicKey) {
    const metadataAccounts = await this.metaplex.connection.getProgramAccounts(
      this.metaplex.programs().getTokenMetadata().address,
      {
        // The mint address is located at byte 33 and lasts for 32 bytes.
        dataSlice: { offset: 33, length: 32 },
        filters: [
          // Only get Metadata accounts.
          { dataSize: MAX_METADATA_LEN },
          // Filter using the first creator.
          {
            memcmp: {
              offset: CREATOR_ARRAY_START,
              bytes: firstCreatorAddress.toBase58(),
            },
          },
        ],
      },
    );

    return metadataAccounts.map((metadataAccountInfo) =>
      bs58.encode(metadataAccountInfo.account.data),
    );
  }

  async getComicIssueCovers(comicIssue: CandyMachineIssue) {
    // this.validateInput(comicIssue); /* Note: Validate the new input */

    let stateLessCovers: MetaplexFile[];
    const haveRarities =
      comicIssue.stateLessCovers && comicIssue.stateLessCovers.length > 0;
    if (haveRarities) {
      const stateLessCoverPromises = comicIssue.stateLessCovers.map((cover) =>
        s3toMxFile(cover.image, cover.rarity),
      );
      stateLessCovers = await Promise.all(stateLessCoverPromises);
    }

    const stateFulCoverPromises = comicIssue.stateFulCovers.map((cover) => {
      const name =
        (cover.isUsed ? 'used-' : 'unused-') +
        (cover.isSigned ? 'signed' : 'unsigned') +
        (haveRarities ? '-' + cover.rarity : '') +
        '-cover';
      return s3toMxFile(cover.image, name);
    });
    const stateFulCovers = await Promise.all(stateFulCoverPromises);

    return { stateFulCovers, stateLessCovers };
  }

  findCover(covers: StateFulCover[], rarity: ComicRarity) {
    return covers.find(
      (cover) => cover.rarity === rarity && !cover.isUsed && !cover.isSigned,
    );
  }

  async uploadMetadata(
    comicIssue: CandyMachineIssue,
    comicName: string,
    creatorAddress: string,
    image: MetaplexFile,
  ) {
    return await this.metaplex.nfts().uploadMetadata({
      name: comicIssue.title,
      symbol: D_PUBLISHER_SYMBOL,
      description: comicIssue.description,
      seller_fee_basis_points: comicIssue.sellerFeeBasisPoints,
      image,
      external_url: D_READER_FRONTEND_URL,
      attributes: [
        {
          trait_type: USED_TRAIT,
          value: DEFAULT_COMIC_ISSUE_USED,
        },
        {
          trait_type: SIGNED_TRAIT,
          value: DEFAULT_COMIC_ISSUE_IS_SIGNED,
        },
      ],
      properties: {
        creators: [{ address: creatorAddress, share: HUNDRED }],
        files: this.writeFiles(image),
      },
      collection: {
        name: comicIssue.title,
        family: comicName,
      },
    });
  }

  async uploadItemMetadata(
    comicIssue: CandyMachineIssue,
    comicName: string,
    coverImage: MetaplexFile,
    creatorAddress: string,
    haveRarity: boolean,
  ) {
    // this.validateInput(comicIssue); : TODO
    let items: { uri: string; name: string }[];
    if (haveRarity) {
      const rarityCovers = {
        Epic: this.findCover(comicIssue.stateFulCovers, 'Epic'),
        Rare: this.findCover(comicIssue.stateFulCovers, 'Rare'),
        Common: this.findCover(comicIssue.stateFulCovers, 'Common'),
        Uncommon: this.findCover(comicIssue.stateFulCovers, 'Uncommon'),
        Legendary: this.findCover(comicIssue.stateFulCovers, 'Legendary'),
      };

      let rarityShare: RarityConstant[];
      const haveFiveRarities = !!rarityCovers.Epic;
      if (haveFiveRarities) {
        rarityShare = FIVE_RARITIES_SHARE;
      } else {
        rarityShare = THREE_RARITIES_SHARE;
      }
      const itemMetadatas: { uri: string; name: string }[] = [],
        items = [];

      let supplyLeft = comicIssue.supply;
      let index = 0;

      for (const shareObject of rarityShare) {
        const { rarity, value } = shareObject;
        const image = await s3toMxFile(rarityCovers[rarity].image, rarity); // use the previous fetch : TODO
        const { uri, metadata } = await this.uploadMetadata(
          comicIssue,
          comicName,
          creatorAddress,
          image,
        );
        itemMetadatas.push({ uri, name: metadata.name });
      }

      index = 0;
      for (const metadata of itemMetadatas) {
        let supply: number;

        const { rarity, value } = rarityShare[index];
        if (index == rarityShare.length - 1) {
          supply = comicIssue.supply - supplyLeft;
        } else {
          supply = (comicIssue.supply * value) / 100;
          supplyLeft -= supply;
        }

        const indexArray = Array.from(Array(supply).keys());
        const itemsInserted = await Promise.all(
          indexArray.map((i) => ({
            uri: metadata.uri,
            name: `${metadata.name} #${i + 1}`,
          })),
        );

        items.push(...itemsInserted);
        index++;
      }
    } else {
      const { uri: metadataUri, metadata } = await this.uploadMetadata(
        comicIssue,
        comicName,
        creatorAddress,
        coverImage,
      );
      const indexArray = Array.from(Array(comicIssue.supply).keys());
      // TODO: start indices from previous highest index
      // e.g. if existing collection has #999 items, continue with #1000
      items = await Promise.all(
        indexArray.map((index) => ({
          uri: metadataUri,
          name: `${metadata.name} #${index + 1}`,
        })),
      );
    }
    return items;
  }

  async createComicIssueCM(
    comicIssue: CandyMachineIssue,
    comicName: string,
    creatorAddress: string,
  ) {
    // this.validateInput(comicIssue);

    // we can do this in parallel
    const coverFiles = await this.getComicIssueCovers(comicIssue);
    const coverImage = await s3toMxFile(comicIssue.cover, 'cover');

    // if Collection NFT already exists - use it, otherwise create a fresh one
    let collectionNftAddress: PublicKey;
    const collectionNft = await this.prisma.collectionNft.findUnique({
      where: { comicIssueId: comicIssue.id },
    });

    const candyMachineKey = Keypair.generate();

    if (collectionNft) {
      collectionNftAddress = new PublicKey(collectionNft.address);
    } else {
      const { uri: collectionNftUri } = await this.metaplex
        .nfts()
        .uploadMetadata({
          name: comicIssue.title,
          symbol: D_PUBLISHER_SYMBOL,
          description: comicIssue.description,
          seller_fee_basis_points: HUNDRED_PERCENT_TAX,
          image: coverImage,
          external_url: D_READER_FRONTEND_URL,
          properties: {
            creators: [
              {
                address: this.metaplex.identity().publicKey.toBase58(),
                share: HUNDRED_PERCENT_TAX,
              },
            ],
            files: this.writeFiles(
              coverImage,
              ...coverFiles.stateFulCovers,
              ...coverFiles.stateLessCovers,
            ),
          },
        });

      const { nft: newCollectionNft } = await this.metaplex.nfts().create({
        uri: collectionNftUri,
        name: comicIssue.title,
        sellerFeeBasisPoints: HUNDRED_PERCENT_TAX,
        symbol: D_PUBLISHER_SYMBOL,
        isCollection: true,
      });

      await this.prisma.collectionNft.create({
        data: {
          address: newCollectionNft.address.toBase58(),
          uri: newCollectionNft.uri,
          name: newCollectionNft.name,
          comicIssue: { connect: { id: comicIssue.id } },
        },
      });

      collectionNftAddress = newCollectionNft.address;
    }

    const comicCreator = new PublicKey(creatorAddress);
    const { candyMachine } = await this.metaplex.candyMachines().create(
      {
        candyMachine: candyMachineKey,
        authority: this.metaplex.identity(),
        collection: {
          address: collectionNftAddress,
          updateAuthority: this.metaplex.identity(),
        },
        symbol: D_PUBLISHER_SYMBOL,
        maxEditionSupply: toBigNumber(0),
        isMutable: true,
        sellerFeeBasisPoints: comicIssue.sellerFeeBasisPoints,
        itemsAvailable: toBigNumber(comicIssue.supply),
        guards: {
          botTax: {
            lamports: solFromLamports(10000),
            lastInstruction: true,
          },
          solPayment: {
            amount: solFromLamports(comicIssue.mintPrice),
            destination: this.metaplex.identity().publicKey,
          },
        },
        creators: [
          {
            address: candyMachineKey.publicKey,
            share: 0,
          },
          {
            address: comicCreator,
            share: HUNDRED,
          },
        ],
      },
      { payer: this.metaplex.identity() },
    );

    await this.prisma.candyMachine.create({
      data: {
        address: candyMachine.address.toBase58(),
        mintAuthorityAddress: candyMachine.mintAuthorityAddress.toBase58(),
        collectionNftAddress: candyMachine.collectionMintAddress.toBase58(),
        itemsAvailable: candyMachine.itemsAvailable.toNumber(),
        itemsMinted: candyMachine.itemsMinted.toNumber(),
        itemsRemaining: candyMachine.itemsRemaining.toNumber(),
        itemsLoaded: candyMachine.itemsLoaded,
        isFullyLoaded: candyMachine.isFullyLoaded,
        baseMintPrice: comicIssue.mintPrice,
        endsAt: undefined,
      },
    });

    // Upload collection item metadata
    const { uri: metadataUri, metadata } = await this.metaplex
      .nfts()
      .uploadMetadata({
        name: comicIssue.title,
        symbol: D_PUBLISHER_SYMBOL,
        description: comicIssue.description,
        seller_fee_basis_points: comicIssue.sellerFeeBasisPoints,
        image: coverImage,
        external_url: D_READER_FRONTEND_URL,
        attributes: [
          {
            trait_type: USED_TRAIT,
            value: DEFAULT_COMIC_ISSUE_USED,
          },
          {
            trait_type: SIGNED_TRAIT,
            value: DEFAULT_COMIC_ISSUE_IS_SIGNED,
          },
        ],
        properties: {
          creators: [{ address: creatorAddress, share: HUNDRED }],
          files: this.writeFiles(coverImage),
        },
        collection: {
          name: comicIssue.title,
          family: comicName,
        },
      });

    const indexArray = Array.from(Array(comicIssue.supply).keys());
    // TODO: start indices from previous highest index
    // e.g. if existing collection has #999 items, continue with #1000
    const items = await this.uploadItemMetadata(
      comicIssue,
      comicName,
      coverImage,
      creatorAddress,
      coverFiles.stateLessCovers.length > 0,
    );

    const INSERT_CHUNK_SIZE = 8;
    const itemChunks = chunk(items, INSERT_CHUNK_SIZE);
    let iteration = 0;
    const transactionBuilders: TransactionBuilder[] = [];
    for (const itemsChunk of itemChunks) {
      console.log(
        `Inserting items ${iteration * INSERT_CHUNK_SIZE}-${
          (iteration + 1) * INSERT_CHUNK_SIZE - 1
        } `,
      );
      const transactionBuilder = this.metaplex
        .candyMachines()
        .builders()
        .insertItems({
          candyMachine,
          index: iteration * INSERT_CHUNK_SIZE,
          items: itemsChunk,
        });
      transactionBuilders.push(transactionBuilder);
      iteration = iteration + 1;
    }

    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash();
    await Promise.all(
      transactionBuilders.map((transactionBuilder) => {
        const transaction = transactionBuilder.toTransaction(latestBlockhash);
        return sendAndConfirmTransaction(
          this.metaplex.connection,
          transaction,
          [this.metaplex.identity()],
        );
      }),
    );

    this.heliusService.subscribeTo(candyMachine.address.toBase58());
    return await this.metaplex.candyMachines().refresh(candyMachine);
  }

  async constructMintOneTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
  ) {
    const mint = Keypair.generate();
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    const mintInstructions = await constructMintInstruction(
      this.metaplex,
      candyMachine.address,
      feePayer,
      mint,
      this.metaplex.connection,
      [
        {
          pubkey: candyMachine.candyGuard.guards.solPayment.destination,
          isSigner: false,
          isWritable: true,
        },
      ],
    );
    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash();
    const mintTransaction = new Transaction({
      feePayer,
      ...latestBlockhash,
    }).add(...mintInstructions);

    mintTransaction.sign(mint);

    const rawTransaction = mintTransaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return rawTransaction.toString('base64');
  }

  async findByAddress(address: string) {
    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address },
    });

    if (!candyMachine) {
      throw new NotFoundException(
        `Candy Machine with address ${address} does not exist`,
      );
    }

    return candyMachine;
  }

  async findReceipts(query: CandyMachineReceiptParams) {
    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: { candyMachineAddress: query.candyMachineAddress },
      include: { nft: true, buyer: true },
      orderBy: { timestamp: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return receipts;
  }

  // validateInput(comicIssue: ComicIssue) {
  //   if (comicIssue.supply <= 0) {
  //     throw new BadRequestException(
  //       'Cannot create an NFT collection with supply lower than 1',
  //     );
  //   }
  //   if (comicIssue.discountMintPrice > comicIssue.mintPrice) {
  //     throw new BadRequestException(
  //       'Discount mint price should be lower than base mint price',
  //     );
  //   } else if (comicIssue.discountMintPrice < 0 || comicIssue.mintPrice < 0) {
  //     throw new BadRequestException(
  //       'Mint prices must be greater than or equal to 0',
  //     );
  //   }
  //   if (!comicIssue.cover) {
  //     throw new BadRequestException('Missing cover image');
  //   }
  //   if (!comicIssue.signedCover) {
  //     throw new BadRequestException('Missing signed cover image');
  //   }
  //   if (!comicIssue.usedCover) {
  //     throw new BadRequestException('Missing used cover image');
  //   }
  //   if (!comicIssue.usedSignedCover) {
  //     throw new BadRequestException('Missing used & signed cover image');
  //   }
  //   if (
  //     comicIssue.sellerFeeBasisPoints < 0 ||
  //     comicIssue.sellerFeeBasisPoints > 10000
  //   ) {
  //     throw new BadRequestException('Invalid seller fee value');
  //   }
  // }

  writeFiles(...files: MetaplexFile[]) {
    return files.map((file) => ({
      uri: file,
      type: file.contentType,
    }));
  }
}
