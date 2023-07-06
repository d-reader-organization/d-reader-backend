import { Injectable, NotFoundException } from '@nestjs/common';
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
  DefaultCandyGuardSettings,
  CandyMachine,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import {
  constructChangeComicStateInstruction,
  constructMintInstruction,
  getRemainingAccounts,
} from './instructions';
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
  SIGNED_TRAIT,
  getRarityShareTable,
  MAX_SIGNATURES_PERCENT,
  RARITY_TRAIT,
  ATTRIBUTE_COMBINATIONS,
  MIN_SIGNATURES,
  BOT_TAX,
  FREEZE_NFT_DAYS,
  DAY_SECONDS,
} from '../constants';
import { solFromLamports } from '../utils/helpers';
import { initMetaplex } from '../utils/metaplex';
import {
  findDefaultCover,
  generateStatefulCoverName,
  validateComicIssueCMInput,
} from '../utils/comic-issue';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import {
  CoverFiles,
  GuardGroup,
  ItemMedata,
  RarityCoverFiles,
} from '../types/shared';
import { getS3Object } from '../aws/s3client';
import axios from 'axios';
import * as FormData from 'form-data';
import { generatePropertyName } from '../utils/nft-metadata';
import { ComicStates, ComicRarity, ComicStateArgs } from 'dreader-comic-verse';
import {
  constructInitializeComicAuthorityInstruction,
  constructInitializeRecordAuthorityInstruction,
} from './instructions';

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

  async mintDarkblock(
    comicIssue: ComicIssueCMInput,
    creatorAddress: string,
  ): Promise<string> {
    try {
      const query = new URLSearchParams({
        apikey: process.env.DARKBLOCK_API_KEY,
      }).toString();

      const form = new FormData();
      const getFileFromS3 = await getS3Object({ Key: comicIssue.pdf });
      const nftPlatform =
        process.env.SOLANA_CLUSTER === 'devnet' ? 'Solana-Devnet' : 'Solana';
      const data = {
        file: getFileFromS3.Body,
        creator_address: this.metaplex.identity().publicKey.toString(),
        nft_platform: nftPlatform,
        nft_standard: 'Metaplex',
        darkblock_description: comicIssue.description,
        publisher_address: creatorAddress,
      };
      Object.entries(data).forEach((val) => {
        form.append(val[0], val[1]);
      });

      const response = await axios.post(
        `${process.env.DARKBLOCK_API}/darkblock/mint?${query}`,
        form,
      );

      return response.data.tx_id;
    } catch (e) {
      console.log(e);
    }
  }

  async getComicIssueCovers(comicIssue: ComicIssueCMInput) {
    const statelessCoverPromises = comicIssue.statelessCovers.map((cover) =>
      s3toMxFile(cover.image),
    );
    const statelessCovers = await Promise.all(statelessCoverPromises);

    const rarityCoverFiles: RarityCoverFiles = {} as RarityCoverFiles;
    const statefulCoverPromises = comicIssue.statefulCovers.map(
      async (cover) => {
        const file = await s3toMxFile(
          cover.image,
          generateStatefulCoverName(cover),
        );
        const property = generatePropertyName(cover.isUsed, cover.isSigned);
        const value = {
          ...rarityCoverFiles[cover.rarity],
          [property]: file,
        };
        rarityCoverFiles[cover.rarity] = value;
        return file;
      },
    );
    const statefulCovers = await Promise.all(statefulCoverPromises);

    return { statefulCovers, statelessCovers, rarityCoverFiles };
  }

  async uploadMetadata(
    comicIssue: ComicIssueCMInput,
    comicName: string,
    creatorAddress: string,
    image: MetaplexFile,
    isUsed: string,
    isSigned: string,
    rarity: ComicRarity,
    darkblockId?: string,
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
          trait_type: RARITY_TRAIT,
          value: ComicRarity[rarity].toString(),
        },
        {
          trait_type: USED_TRAIT,
          value: isUsed,
        },
        {
          trait_type: SIGNED_TRAIT,
          value: isSigned,
        },
      ],
      properties: {
        creators: [{ address: creatorAddress, share: HUNDRED }],
        files: [
          ...this.writeFiles(image),
          darkblockId
            ? {
                type: 'Darkblock',
                uri: darkblockId,
              }
            : undefined,
        ],
      },
      collection: {
        name: comicIssue.title,
        family: comicName,
      },
    });
  }

  async uploadAllMetadata(
    comicIssue: ComicIssueCMInput,
    comicName: string,
    creatorAddress: string,
    rarityCoverFiles: CoverFiles,
    darkblockId: string,
    rarity: ComicRarity,
    collectionNftAddress: PublicKey,
  ) {
    const itemMetadata: ItemMedata = {} as ItemMedata;
    await Promise.all(
      ATTRIBUTE_COMBINATIONS.map(async ([isUsed, isSigned]) => {
        const property = generatePropertyName(isUsed, isSigned);
        const darkblock = isUsed ? darkblockId : undefined;
        itemMetadata[property] = await this.uploadMetadata(
          comicIssue,
          comicName,
          creatorAddress,
          rarityCoverFiles[property],
          isUsed.toString(),
          isSigned.toString(),
          rarity,
          darkblock,
        );
      }),
    );

    const comicStates: ComicStates = {
      unusedSigned: itemMetadata.unusedSigned.uri,
      unusedUnsigned: itemMetadata.unusedUnsigned.uri,
      usedSigned: itemMetadata.usedSigned.uri,
      usedUnsigned: itemMetadata.usedUnsigned.uri,
    };
    await this.initializeAuthority(collectionNftAddress, rarity, comicStates);
    return itemMetadata;
  }

  async uploadItemMetadata(
    comicIssue: ComicIssueCMInput,
    collectionNftAddress: PublicKey,
    comicName: string,
    creatorAddress: string,
    numberOfRarities: number,
    darkblockId: string,
    rarityCoverFiles?: RarityCoverFiles,
  ) {
    const items: { uri: string; name: string }[] = [];

    const rarityShares = getRarityShareTable(numberOfRarities);
    const itemMetadatas: { uri: string; name: string }[] = [];
    let supplyLeft = comicIssue.supply;

    for (const rarityShare of rarityShares) {
      const { rarity } = rarityShare;
      // TODO: we should deprecate the rarityCoverFiles and stick with the array of covers format
      const itemMetadata = await this.uploadAllMetadata(
        comicIssue,
        comicName,
        creatorAddress,
        rarityCoverFiles[ComicRarity[rarity].toString()],
        darkblockId,
        rarity,
        collectionNftAddress,
      );
      const { unusedUnsigned } = itemMetadata;
      itemMetadatas.push({
        uri: unusedUnsigned.uri,
        name: unusedUnsigned.metadata.name,
      });
    }

    let index = 0;
    for (const metadata of itemMetadatas) {
      let supply: number;

      const { value } = rarityShares[index];
      if (index == rarityShares.length - 1) {
        supply = supplyLeft;
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
    return items;
  }

  async initializeGuardAccounts(
    candyMachine: CandyMachine<DefaultCandyGuardSettings>,
  ) {
    try {
      await this.metaplex.candyMachines().callGuardRoute({
        candyMachine,
        guard: 'freezeSolPayment',
        settings: {
          path: 'initialize',
          period: FREEZE_NFT_DAYS * DAY_SECONDS,
          candyGuardAuthority: this.metaplex.identity(),
        },
      });
    } catch (e) {
      console.log(e);
    }
  }

  async createComicIssueCM(
    comicIssue: ComicIssueCMInput,
    comicName: string,
    creatorAddress: string,
    groups?: GuardGroup[],
  ) {
    validateComicIssueCMInput(comicIssue);

    const { statefulCovers, statelessCovers, rarityCoverFiles } =
      await this.getComicIssueCovers(comicIssue);

    const cover = findDefaultCover(comicIssue.statelessCovers);
    const coverImage = await s3toMxFile(cover.image);

    // if Collection NFT already exists - use it, otherwise create a fresh one
    let collectionNftAddress: PublicKey;
    const collectionNft = await this.prisma.collectionNft.findUnique({
      where: { comicIssueId: comicIssue.id },
    });

    const candyMachineKey = Keypair.generate();

    let darkblockId: string;
    if (collectionNft) {
      collectionNftAddress = new PublicKey(collectionNft.address);
    } else {
      darkblockId = await this.mintDarkblock(comicIssue, creatorAddress);
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
            files: [
              ...this.writeFiles(
                coverImage,
                ...statefulCovers,
                ...statelessCovers,
              ),
              {
                type: 'Darkblock',
                uri: darkblockId,
              },
            ],
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
          name: newCollectionNft.name,
          comicIssue: { connect: { id: comicIssue.id } },
        },
      });
      collectionNftAddress = newCollectionNft.address;
    }
    await this.initializeRecordAuthority(
      collectionNftAddress,
      new PublicKey(creatorAddress),
      MAX_SIGNATURES_PERCENT,
      MIN_SIGNATURES,
    );

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
            lamports: solFromLamports(BOT_TAX),
            lastInstruction: true,
          },
          freezeSolPayment: {
            amount: solFromLamports(comicIssue.mintPrice),
            destination: this.metaplex.identity().publicKey,
          },
        },
        groups,
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

    await this.initializeGuardAccounts(candyMachine);
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
    const items = await this.uploadItemMetadata(
      comicIssue,
      collectionNftAddress,
      comicName,
      creatorAddress,
      statelessCovers.length,
      darkblockId,
      rarityCoverFiles,
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

  async updateCandyMachine(
    candyMachineAddress: PublicKey,
    groups?: GuardGroup[],
    guards?: Partial<DefaultCandyGuardSettings>,
  ) {
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    await this.metaplex.candyMachines().update({
      candyMachine,
      groups,
      guards,
    });
  }

  async constructMintOneTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
    label?: string,
    nftGateMint?: PublicKey,
    allowList?: string[],
  ) {
    try {
      const mint = Keypair.generate();
      const candyMachine = await this.metaplex
        .candyMachines()
        .findByAddress({ address: candyMachineAddress });

      const remainingAccounts = getRemainingAccounts(this.metaplex, {
        candyMachine,
        feePayer,
        mint: mint.publicKey,
        destinationWallet: this.metaplex.identity().publicKey,
        label,
        nftGateMint,
      });
      const mintInstructions = await constructMintInstruction(
        this.metaplex,
        candyMachine.address,
        feePayer,
        mint,
        this.metaplex.connection,
        remainingAccounts,
        undefined,
        label,
        allowList,
      );
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();
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
    } catch (e) {
      console.log(e);
    }
  }

  async constructChangeComicStateTransaction(
    collectionMint: PublicKey,
    candyMachineAddress: PublicKey,
    rarity: ComicRarity,
    mint: PublicKey,
    feePayer: PublicKey,
    newState: ComicStateArgs,
  ) {
    try {
      let owner = feePayer;
      if (newState == ComicStateArgs.Sign) {
        const { ownerAddress } = await this.prisma.nft.findUnique({
          where: { address: mint.toString() },
        });
        owner = new PublicKey(ownerAddress);
      }
      const instruction = await constructChangeComicStateInstruction(
        this.metaplex,
        collectionMint,
        candyMachineAddress,
        rarity,
        mint,
        feePayer,
        owner,
        newState,
      );
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();

      const tx = new Transaction({
        feePayer,
        ...latestBlockhash,
      }).add(instruction);

      const rawTransaction = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      return rawTransaction.toString('base64');
    } catch (e) {
      console.log('Error processing transaction: ', e);
    }
  }

  async initializeRecordAuthority(
    collectionMint: PublicKey,
    creator: PublicKey,
    maxSignature: number,
    minSignatures: number,
  ) {
    try {
      const instruction = await constructInitializeRecordAuthorityInstruction(
        this.metaplex,
        collectionMint,
        creator,
        maxSignature,
        minSignatures,
      );
      const tx = new Transaction().add(instruction);
      await sendAndConfirmTransaction(this.metaplex.connection, tx, [
        this.metaplex.identity(),
      ]);
    } catch (e) {
      console.log('Record Authority account is not initialized : ', e);
    }
  }

  async initializeAuthority(
    collectionMint: PublicKey,
    rarity: ComicRarity,
    comicStates: ComicStates,
  ) {
    try {
      const instruction = await constructInitializeComicAuthorityInstruction(
        this.metaplex,
        collectionMint,
        rarity,
        comicStates,
      );
      const tx = new Transaction().add(instruction);
      await sendAndConfirmTransaction(this.metaplex.connection, tx, [
        this.metaplex.identity(),
      ]);
    } catch (e) {
      console.log('Authority account is not initialized : ', e);
    }
  }

  async thawFrozenNft(
    candyMachineAddress: PublicKey,
    nftMint: PublicKey,
    nftOwner: PublicKey,
  ) {
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    await this.metaplex.candyMachines().callGuardRoute({
      candyMachine,
      guard: 'freezeSolPayment',
      settings: {
        path: 'thaw',
        nftMint,
        nftOwner,
      },
    });
  }

  async unlockFunds(candyMachineAddress: PublicKey) {
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    await this.metaplex.candyMachines().callGuardRoute({
      candyMachine,
      guard: 'freezeSolPayment',
      settings: {
        path: 'unlockFunds',
        candyGuardAuthority: this.metaplex.identity(),
      },
    });
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

  writeFiles(...files: MetaplexFile[]) {
    return files.map((file) => ({
      uri: file,
      type: file.contentType,
    }));
  }
}
