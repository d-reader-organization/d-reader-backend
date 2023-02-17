import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Cluster,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  keypairIdentity,
  Metaplex,
  MetaplexFile,
  toBigNumber,
  toMetaplexFile,
  sol,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { awsStorage } from '@metaplex-foundation/js-plugin-aws';
import { getS3Object, s3Client } from 'src/aws/s3client';
import { Comic, ComicIssue, Creator } from '@prisma/client';
import * as bs58 from 'bs58';
import * as path from 'path';
import { chunk } from 'lodash';
import { sleep } from 'src/utils/helpers';
import { clusterHeliusApiUrl } from 'src/utils/helius';
import { streamToString } from 'src/utils/files';
import { Readable } from 'stream';
import { mintInstruction } from './instructions/mint';

const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const MAX_CREATOR_LIMIT = 5;
const MAX_DATA_SIZE =
  4 +
  MAX_NAME_LENGTH +
  4 +
  MAX_SYMBOL_LENGTH +
  4 +
  MAX_URI_LENGTH +
  2 +
  1 +
  4 +
  MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
const CREATOR_ARRAY_START =
  1 +
  32 +
  32 +
  4 +
  MAX_NAME_LENGTH +
  4 +
  MAX_URI_LENGTH +
  4 +
  MAX_SYMBOL_LENGTH +
  2 +
  1 +
  4;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const D_READER_SYMBOL = 'dReader';
const D_PUBLISHER_SYMBOL = 'dPublisher';

const D_READER_FRONTEND_URL = 'https://dreader.app';

const SECONDARY_SALE_TAX = 800; // 8%
const HUNDRED = 100;
const HUNDRED_PERCENT_TAX = 10000;

// v2: in the future this will vary 10-20% depending on the type of comic
// we will have to create a simple function with a switch case `calculatePublisherCut`
const D_PUBLISHER_PRIMARY_SALE_SHARE = 10;
const D_PUBLISHER_SECONDARY_SALE_SHARE = 25;

/** @deprecated */
// const GLOBAL_BOT_TAX = 0.01;

const STATE_TRAIT = 'state';
const SIGNED_TRAIT = 'signed';
const DEFAULT_COMIC_ISSUE_STATE = 'mint';
const DEFAULT_COMIC_ISSUE_IS_SIGNED = 'false';

@Injectable()
export class CandyMachineService {
  private readonly connection: Connection;
  private readonly metaplex: Metaplex;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = clusterHeliusApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    this.connection = new Connection(endpoint, 'confirmed');
    this.metaplex = new Metaplex(this.connection);

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
    const metadataAccounts = await this.connection.getProgramAccounts(
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
    // TODO copy S3 image from one bucket to another (with d-reader-nft-data)
    const coverImage = await this.generateMetaplexFileFromS3(comicIssue.cover);

    // If Collection NFT already exists - use it, otherwise create a fresh one
    let collectionNftAddress: PublicKey;
    const collectionNft = await this.prisma.comicIssueCollectionNft.findUnique({
      where: { comicIssueId: comicIssue.id },
    });

    if (collectionNft) {
      collectionNftAddress = new PublicKey(collectionNft.address);
    } else {
      const newCollectionNft = await this.createComicIssueCollectionNft(
        comicIssue,
        coverImage,
      );

      await this.prisma.comicIssueCollectionNft.create({
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
        candyMachine: Keypair.generate(), // v2: prefix key with 'cndy'
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
        // TODO: test if this is actually indexing or if it's done automatically
        name: `${sharedMetadata.name} #${index + 1}`,
      })),
    );

    const INSERT_CHUNK_SIZE = 10;
    const itemChunksOfTen = chunk(items, INSERT_CHUNK_SIZE);
    let iteration = 0;
    // TODO: this most likely can't get executed in parallel but we can possibly take up more than 10 items per chunk
    for (const itemsChunk of itemChunksOfTen) {
      console.log(
        `Inserting items ${iteration * INSERT_CHUNK_SIZE}-${
          (iteration + 1) * INSERT_CHUNK_SIZE - 1
        } `,
      );

      await sleep(100); // to prevent API rate limiting on free RPC nodes, we can remove this in production
      await this.metaplex.candyMachines().insertItems({
        candyMachine: candyMachine,
        index: iteration * INSERT_CHUNK_SIZE,
        items: itemsChunk,
      });
      iteration = iteration + 1;
    }

    return await this.metaplex.candyMachines().refresh(candyMachine);
  }

  // TODO: contain data about the collection: flavorText, comic name, creator name, pagesCount, issue.number...
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
            trait_type: STATE_TRAIT,
            value: DEFAULT_COMIC_ISSUE_STATE,
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

  async mintOne(candyMachineAddress: string) {
    const candyMachine = await this.metaplex.candyMachines().findByAddress({
      address: new PublicKey(candyMachineAddress),
    });

    const mintNftResponse = await this.metaplex.candyMachines().mint({
      candyMachine,
      guards: {
        thirdPartySigner: { signer: this.metaplex.identity() },
      },
      collectionUpdateAuthority: this.metaplex.identity().publicKey,
    });

    console.log('********** NFT Minted **********');
    console.log(mintNftResponse.nft.address);
  }

  async constructMintOneTransaction(
    feePayer: PublicKey,
    candy_machine_address: string,
  ) {
    const mint = Keypair.generate();
    const candyMachine = new PublicKey(candy_machine_address);
    const mint_ix = await mintInstruction(
      this.metaplex,
      candyMachine,
      feePayer,
      mint,
      this.metaplex.connection,
      [
        {
          pubkey: this.metaplex.identity().publicKey,
          isSigner: false,
          isWritable: true,
        },
      ],
    );

    const tx = new Transaction().add(...mint_ix.instructions);
    tx.feePayer = feePayer;
    tx.recentBlockhash = (
      await this.metaplex.connection.getLatestBlockhash()
    ).blockhash;
    tx.sign(mint);

    const rawTransaction = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return rawTransaction.toString('base64');
  }

  async generateMetaplexFileFromS3(key: string) {
    const getCoverFromS3 = await getS3Object({ Key: key });
    const coverImage = await streamToString(getCoverFromS3.Body as Readable);
    const coverImageFileName = 'cover' + path.extname(key);
    return toMetaplexFile(coverImage, coverImageFileName);
  }
}
