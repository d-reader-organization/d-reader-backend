import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Cluster,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  keypairIdentity,
  Metaplex,
  MetaplexFile,
  toBigNumber,
  toMetaplexFile,
  sol,
  TransactionBuilder,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { awsStorage } from '@metaplex-foundation/js-plugin-aws';
import { getS3Object, s3Client } from '../aws/s3client';
import { Comic, ComicIssue, Creator } from '@prisma/client';
import { streamToString } from '../utils/files';
import { constructMintInstruction } from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import { heliusClusterApiUrl } from 'helius-sdk';
import { Readable } from 'stream';
import { chunk } from 'lodash';
import * as bs58 from 'bs58';
import * as path from 'path';
import {
  MAX_METADATA_LEN,
  CREATOR_ARRAY_START,
  D_PUBLISHER_SYMBOL,
  SECONDARY_SALE_TAX,
  D_PUBLISHER_PRIMARY_SALE_SHARE,
  HUNDRED,
  HUNDRED_PERCENT_TAX,
  D_READER_FRONTEND_URL,
  USED_TRAIT,
  DEFAULT_COMIC_ISSUE_USED,
  SIGNED_TRAIT,
  DEFAULT_COMIC_ISSUE_IS_SIGNED,
  D_PUBLISHER_SECONDARY_SALE_SHARE,
} from '../constants';

@Injectable()
export class CandyMachineService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {
    const endpoint = heliusClusterApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    const connection = new Connection(endpoint, 'confirmed');
    this.metaplex = new Metaplex(connection);

    const treasuryWallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const treasuryKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(treasuryWallet.toString(Utf8))),
    );

    this.metaplex
      .use(keypairIdentity(treasuryKeypair))
      .use(awsStorage(s3Client, process.env.AWS_BUCKET_NAME + '-metadata'));
  }

  async findMintedNfts(candyMachineAddress: string) {
    try {
      const candyMachineId = new PublicKey(candyMachineAddress);
      const candyMachineCreator = PublicKey.findProgramAddressSync(
        [Buffer.from('candy_machine'), candyMachineId.toBuffer()],
        this.metaplex.programs().getCandyMachine().address,
      );
      console.log(candyMachineCreator);
      const mints = await this.getMintAddresses(candyMachineCreator[0]);
      console.log("minted NFT's : ", mints);
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

  // v2: when creating the candy machine create 4 different metadata URIs: mint unsigned, mint signed, used unsigned, used signed
  // This NFT would serve as a root NFT, a collection of collections (comic issues)
  // https://docs.metaplex.com/programs/token-metadata/certified-collections#nested-collections
  async createComicIssueCM(
    comic: Comic,
    comicIssue: ComicIssue,
    creator: Creator,
  ) {
    if (comicIssue.supply <= 0) {
      throw new BadRequestException(
        'Cannot create an NFT collection with supply lower than 1',
      );
    }
    const coverImage = await this.generateMetaplexFileFromS3(comicIssue.cover);

    // If Collection NFT already exists - use it, otherwise create a fresh one
    let collectionNftAddress: PublicKey;
    const collectionNft = await this.prisma.collectionNft.findUnique({
      where: { comicIssueId: comicIssue.id },
    });

    if (collectionNft) {
      collectionNftAddress = new PublicKey(collectionNft.address);
    } else {
      const newCollectionNft = await this.createComicIssueCollectionNft(
        comicIssue,
        coverImage,
      );

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

    // v2: try catch
    const comicCreator = new PublicKey(creator.walletAddress);

    const { candyMachine } = await this.metaplex.candyMachines().create(
      {
        candyMachine: Keypair.generate(),
        authority: this.metaplex.identity(),
        collection: {
          address: collectionNftAddress,
          updateAuthority: this.metaplex.identity(),
        },
        symbol: D_PUBLISHER_SYMBOL,
        maxEditionSupply: toBigNumber(0),
        isMutable: true,
        sellerFeeBasisPoints: SECONDARY_SALE_TAX,
        itemsAvailable: toBigNumber(comicIssue.supply),
        // groups: [], // v2: add different groups
        guards: {
          botTax: undefined,
          solPayment: {
            amount: sol(comicIssue.mintPrice),
            destination: this.metaplex.identity().publicKey,
          },
          tokenPayment: undefined,
          startDate: undefined,
          endDate: undefined, // v2: close mints after a long period of stale sales?
          // thirdPartySigner: { signerKey: this.metaplex.identity().publicKey }, // v2: do we really need this?
          tokenGate: undefined, // v2: gate minting to $PAGES non-holders
          gatekeeper: undefined, // v2: add bot protection
          allowList: undefined, // v2: make sure that holders of previous issues have advantage of miting ahead of time
          mintLimit: undefined, // v2: possibly limit minting to ~2 NFTs or depending on your 'level'
          redeemedAmount: undefined, // v2: possibly secure n% of the supply for dReader drops (staking) and creators wallet
          addressGate: undefined, // v2: combine with groups and redemeedAmount to secure mints for creators and dReader
          nftPayment: undefined,
          nftGate: undefined, // v2: gate special editions in the future?
          nftBurn: undefined, // v2: creators can drop 'FREE MINT' NFTs to end users
          tokenBurn: undefined,
          freezeSolPayment: undefined,
          freezeTokenPayment: undefined,
          programGate: undefined,
        },
        creators: [
          {
            address: this.metaplex.identity().publicKey,
            share: D_PUBLISHER_PRIMARY_SALE_SHARE,
          },
          {
            address: comicCreator,
            share: HUNDRED - D_PUBLISHER_PRIMARY_SALE_SHARE,
          },
        ],
      },
      { payer: this.metaplex.identity() }, // v2: in the future comicCreator might become the payer
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

    const sharedMetadata = await this.createComicIssueMintNftMetadata(
      comic,
      comicIssue,
      creator,
      coverImage,
    );

    const indexArray = Array.from(Array(comicIssue.supply).keys());
    const items = await Promise.all(
      indexArray.map((index) => ({
        uri: sharedMetadata.uri,
        name: `${sharedMetadata.name} #${index + 1}`,
      })),
    );

    const INSERT_CHUNK_SIZE = 9;
    const itemChunksOfTen = chunk(items, INSERT_CHUNK_SIZE);
    let iteration = 0;
    const transactionBuilders: TransactionBuilder[] = [];
    for (const itemsChunk of itemChunksOfTen) {
      console.log(
        `Inserting items ${iteration * INSERT_CHUNK_SIZE}-${
          (iteration + 1) * INSERT_CHUNK_SIZE - 1
        } `,
      );
      const transactionBuilder = this.metaplex
        .candyMachines()
        .builders()
        .insertItems({
          candyMachine: candyMachine,
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

  async createComicIssueCollectionNft(
    comicIssue: ComicIssue,
    coverImage: MetaplexFile,
  ) {
    try {
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
            // TODO v2: add 4 images here, for 4 different states?
            files: [
              {
                uri: coverImage,
                type: coverImage.contentType,
              },
            ],
          },
        });

      const createNftOutput = await this.metaplex.nfts().create({
        uri: collectionNftUri,
        name: comicIssue.title,
        sellerFeeBasisPoints: HUNDRED_PERCENT_TAX,
        symbol: D_PUBLISHER_SYMBOL,
        isCollection: true,
      });

      return createNftOutput.nft;
    } catch (e) {
      throw new BadRequestException(
        `Error while trying to create the Collection NFT for Issue ${comicIssue.id}: ${e}`,
      );
    }
  }

  async createComicIssueMintNftMetadata(
    comic: Comic,
    comicIssue: ComicIssue,
    creator: Creator,
    coverImage: MetaplexFile,
  ) {
    try {
      const { uri, metadata } = await this.metaplex.nfts().uploadMetadata({
        name: comicIssue.title,
        symbol: D_PUBLISHER_SYMBOL,
        description: comicIssue.description,
        seller_fee_basis_points: SECONDARY_SALE_TAX,
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
          creators: [
            {
              address: this.metaplex.identity().publicKey.toBase58(),
              share: D_PUBLISHER_SECONDARY_SALE_SHARE,
            },
            {
              address: creator.walletAddress,
              share: HUNDRED - D_PUBLISHER_SECONDARY_SALE_SHARE,
            },
          ],
          files: [
            {
              uri: coverImage,
              type: coverImage.contentType,
            },
          ],
        },
        collection: {
          name: comicIssue.title,
          family: comic.name,
        },
      });

      return { uri, name: metadata.name };
    } catch (e) {
      throw new BadRequestException(
        `Error while trying to create the NFT metadata: ${e}`,
      );
    }
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
      skip: query.skip,
      take: query.take,
    });

    return receipts;
  }

  async generateMetaplexFileFromS3(key: string) {
    const getCoverFromS3 = await getS3Object({ Key: key });
    const coverImage = await streamToString(getCoverFromS3.Body as Readable);
    const coverImageFileName = 'cover' + path.extname(key);
    return toMetaplexFile(coverImage, coverImageFileName);
  }
}
