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
  DefaultCandyGuardSettings,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import { constructMintInstruction, getRemainingAccounts } from './instructions';
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
  getRarityShareTable,
} from '../constants';
import { solFromLamports } from '../utils/helpers';
import { initMetaplex } from '../utils/metaplex';
import {
  findDefaultCover,
  generateStatefulCoverName,
  validateComicIssueCMInput,
} from '../utils/comic-issue';
import { ComicRarity, StatefulCover } from '@prisma/client';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { RarityCoverFiles } from 'src/types/shared';

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

  async getComicIssueCovers(comicIssue: ComicIssueCMInput) {
    const hasRarities = comicIssue.statelessCovers.length > 1;
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
        if (hasRarities) {
          const property =
            (cover.isUsed ? 'used' : 'unused') +
            (cover.isSigned ? 'Signed' : 'Unsigned');
          rarityCoverFiles[cover.rarity][property] = file;
        }
        return file;
      },
    );
    const statefulCovers = await Promise.all(statefulCoverPromises);

    return { statefulCovers, statelessCovers, rarityCoverFiles };
  }

  findCover(covers: StatefulCover[], rarity: ComicRarity) {
    return covers.find(
      (cover) => cover.rarity === rarity && !cover.isUsed && !cover.isSigned,
    );
  }

  async uploadMetadata(
    comicIssue: ComicIssueCMInput,
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
    comicIssue: ComicIssueCMInput,
    comicName: string,
    coverImage: MetaplexFile,
    creatorAddress: string,
    numberOfRarities: number,
    rarityCoverFiles?: RarityCoverFiles,
  ) {
    const hasRarities = numberOfRarities > 1;

    let items: { uri: string; name: string }[] = [];
    if (hasRarities) {
      const rarityShares = getRarityShareTable(numberOfRarities);
      const itemMetadatas: { uri: string; name: string }[] = [];

      let supplyLeft = comicIssue.supply;

      for (const rarityShare of rarityShares) {
        const { rarity } = rarityShare;
        const image = rarityCoverFiles[rarity].unusedUnsigned;
        const { uri, metadata } = await this.uploadMetadata(
          comicIssue,
          comicName,
          creatorAddress,
          image,
        );
        itemMetadatas.push({ uri, name: metadata.name });
      }

      let index = 0;
      for (const metadata of itemMetadatas) {
        let supply: number;

        const { value } = rarityShares[index];
        if (index == rarityShares.length - 1) {
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
    comicIssue: ComicIssueCMInput,
    comicName: string,
    creatorAddress: string,
    groups?: [
      {
        label: string;
        guards: Partial<DefaultCandyGuardSettings>;
      },
    ],
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
              ...statefulCovers,
              ...statelessCovers,
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
      comicName,
      coverImage,
      creatorAddress,
      statelessCovers.length,
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
