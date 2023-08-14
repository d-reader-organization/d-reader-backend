import { Injectable, NotFoundException } from '@nestjs/common';
import { Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  Metaplex,
  toBigNumber,
  TransactionBuilder,
  DefaultCandyGuardSettings,
  CandyMachine,
  JsonMetadata,
  getMerkleRoot,
  toDateTime,
  CreateCandyMachineInput,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import {
  constructChangeComicStateTransaction,
  constructMintOneTransaction,
  initializeRecordAuthority,
} from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import { chunk } from 'lodash';
import * as bs58 from 'bs58';
import {
  MAX_METADATA_LEN,
  CREATOR_ARRAY_START,
  D_PUBLISHER_SYMBOL,
  HUNDRED_PERCENT_TAX,
  D_READER_FRONTEND_URL,
  MAX_SIGNATURES_PERCENT,
  MIN_SIGNATURES,
  BOT_TAX,
  FREEZE_NFT_DAYS,
  DAY_SECONDS,
  RARITY_MAP,
  AUTHORITY_GROUP_LABEL,
  PUBLIC_GROUP_LABEL,
} from '../constants';
import { solFromLamports } from '../utils/helpers';
import { MetdataFile, metaplex, writeFiles } from '../utils/metaplex';
import {
  findDefaultCover,
  generateStatefulCoverName,
  validateComicIssueCMInput,
} from '../utils/comic-issue';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { GuardGroup, RarityCoverFiles } from '../types/shared';
import {
  generatePropertyName,
  uploadItemMetadata,
} from '../utils/nft-metadata';
import {
  ComicStateArgs,
  PROGRAM_ID as COMIC_VERSE_ID,
} from 'dreader-comic-verse';
import { DarkblockService } from './darkblock.service';
import { PUB_AUTH_TAG, pda } from './instructions/pda';

type JsonMetadataCreators = JsonMetadata['properties']['creators'];

@Injectable()
export class CandyMachineService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
    private readonly darkblockService: DarkblockService,
  ) {
    this.metaplex = metaplex;
  }

  async findMintedNfts(candyMachineAddress: string) {
    const candyMachineId = new PublicKey(candyMachineAddress);
    const candyMachineCreator = PublicKey.findProgramAddressSync(
      [Buffer.from('candy_machine'), candyMachineId.toBuffer()],
      this.metaplex.programs().getCandyMachine().address,
    );

    return await this.getMintAddresses(candyMachineCreator[0]);
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

  async initializeGuardAccounts(
    candyMachine: CandyMachine<DefaultCandyGuardSettings>,
  ) {
    await this.metaplex.candyMachines().callGuardRoute({
      candyMachine,
      guard: 'freezeSolPayment',
      settings: {
        path: 'initialize',
        period: FREEZE_NFT_DAYS * DAY_SECONDS,
        candyGuardAuthority: this.metaplex.identity(),
      },
      group: AUTHORITY_GROUP_LABEL,
    });
  }

  async createComicIssueCM(
    comicIssue: ComicIssueCMInput,
    comicName: string,
    startDate: Date,
    endDate: Date,
    groups?: GuardGroup[],
  ) {
    validateComicIssueCMInput(comicIssue);

    const creatorAddress = comicIssue.creatorAddress;
    const royaltyWallets: JsonMetadataCreators = comicIssue.royaltyWallets;

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

    let darkblockId = '';
    if (collectionNft) {
      collectionNftAddress = new PublicKey(collectionNft.address);
    } else {
      let darkblockMetadataFile: MetdataFile;
      if (comicIssue.pdf) {
        darkblockId = await this.darkblockService.mintDarkblock(
          comicIssue.pdf,
          comicIssue.description,
          creatorAddress,
        );
        darkblockMetadataFile = {
          type: 'Darkblock',
          uri: darkblockId,
        };
      }

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
              ...writeFiles(coverImage, ...statefulCovers, ...statelessCovers),
              darkblockMetadataFile,
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
    const recordAuthorityPda = await pda(
      [Buffer.from(PUB_AUTH_TAG), collectionNftAddress.toBuffer()],
      COMIC_VERSE_ID,
    );
    const recordAuthority = await this.metaplex.connection.getAccountInfo(
      recordAuthorityPda,
    );

    if (!recordAuthority) {
      await initializeRecordAuthority(
        this.metaplex,
        collectionNftAddress,
        new PublicKey(creatorAddress),
        MAX_SIGNATURES_PERCENT,
        MIN_SIGNATURES,
      );
    }

    const creators: CreateCandyMachineInput['creators'] = royaltyWallets.map(
      (wallet) => ({
        address: new PublicKey(wallet.address),
        share: wallet.share,
      }),
    );
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
        groups: [
          {
            label: AUTHORITY_GROUP_LABEL,
            guards: {
              allowList: {
                merkleRoot: getMerkleRoot([
                  this.metaplex.identity().publicKey.toString(),
                ]),
              },
              freezeSolPayment: {
                amount: solFromLamports(0),
                destination: this.metaplex.identity().publicKey,
              },
            },
          },
          {
            label: PUBLIC_GROUP_LABEL,
            guards: {
              startDate: {
                date: toDateTime(startDate),
              },
              endDate: {
                date: toDateTime(endDate),
              },
            },
          },
          ...(groups ?? []),
        ],
        creators,
      },
      { payer: this.metaplex.identity() },
    );
    await this.initializeGuardAccounts(candyMachine);
    const authorityPda = this.metaplex
      .candyMachines()
      .pdas()
      .authority({ candyMachine: candyMachine.address })
      .toString();

    await this.prisma.candyMachine.create({
      data: {
        address: candyMachine.address.toBase58(),
        mintAuthorityAddress: candyMachine.mintAuthorityAddress.toBase58(),
        collectionNftAddress: candyMachine.collectionMintAddress.toBase58(),
        authorityPda,
        itemsAvailable: candyMachine.itemsAvailable.toNumber(),
        itemsMinted: candyMachine.itemsMinted.toNumber(),
        itemsRemaining: candyMachine.itemsRemaining.toNumber(),
        itemsLoaded: candyMachine.itemsLoaded,
        isFullyLoaded: candyMachine.isFullyLoaded,
        baseMintPrice: comicIssue.mintPrice,
        endsAt: undefined,
      },
    });
    const items = await uploadItemMetadata(
      metaplex,
      comicIssue,
      collectionNftAddress,
      comicName,
      royaltyWallets,
      statelessCovers.length,
      darkblockId,
      rarityCoverFiles,
    );

    const INSERT_CHUNK_SIZE = 8;
    const itemChunks = chunk(items, INSERT_CHUNK_SIZE);
    let iteration = 0;
    const transactionBuilders: TransactionBuilder[] = [];
    for (const itemsChunk of itemChunks) {
      console.info(
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

  async createMintOneTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
  ) {
    return await constructMintOneTransaction(
      this.metaplex,
      feePayer,
      candyMachineAddress,
      PUBLIC_GROUP_LABEL,
    );
  }

  async createChangeComicStateTransaction(
    mint: PublicKey,
    feePayer: PublicKey,
    newState: ComicStateArgs,
  ) {
    const {
      ownerAddress,
      collectionNftAddress,
      candyMachineAddress,
      metadata,
    } = await this.prisma.nft.findUnique({
      where: { address: mint.toString() },
      include: { metadata: true },
    });

    const owner = new PublicKey(ownerAddress);
    const collectionMintPubKey = new PublicKey(collectionNftAddress);
    const candyMachinePubKey = new PublicKey(candyMachineAddress);
    const numberedRarity = RARITY_MAP[metadata.rarity];

    return await constructChangeComicStateTransaction(
      this.metaplex,
      owner,
      collectionMintPubKey,
      candyMachinePubKey,
      numberedRarity,
      mint,
      feePayer,
      newState,
    );
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
      include: { nft: true, buyer: { include: { user: true } } },
      orderBy: { timestamp: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return receipts;
  }

  async findCandyMachineGroups(candyMachineAddress: string) {
    const address = new PublicKey(candyMachineAddress);
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address });
    return candyMachine.candyGuard.groups.filter(
      (group) => group.label != AUTHORITY_GROUP_LABEL,
    );
  }
}
