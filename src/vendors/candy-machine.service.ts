import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BlockhashWithExpiryBlockHeight,
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  IdentitySigner,
  keypairIdentity,
  Metaplex,
  MetaplexFile,
  toBigNumber,
  toDateTime,
  toMetaplexFile,
  sol,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { readFileSync } from 'fs';
import { awsStorage } from '@metaplex-foundation/js-plugin-aws';
import { getS3Object, s3Client } from 'src/aws/s3client';
import { Comic, ComicIssue, Creator } from '@prisma/client';
import { Readable } from 'stream';
import * as bs58 from 'bs58';
import * as path from 'path';

const streamToString = (stream: Readable) => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('error', reject);
  });
};

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const SECONDARY_SALE_TAX = 800; // 8%
const HUNDRED = 100;
const HUNDRED_PERCENT_TAX = 10000;

// v2: in the future this will vary 10-20% depending on the type of comic
// we will have to create a simple function with a switch case `calculatePublisherCut`
const D_PUBLISHER_PRIMARY_SALE_SHARE = 10;
const D_PUBLISHER_SECONDARY_SALE_SHARE = 25;

const GLOBAL_BOT_TAX = 0.01;

const STATE_TRAIT = 'state';
const SIGNED_TRAIT = 'signed';
const DEFAULT_COMIC_ISSUE_STATE = 'mint';
const DEFAULT_COMIC_ISSUE_IS_SIGNED = 'false';

@Injectable()
export class CandyMachineService {
  private readonly connection: Connection;
  private readonly metaplex: Metaplex;

  constructor(private readonly prisma: PrismaService) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_NODE_ENDPOINT,
      'confirmed',
    );
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
      .use(awsStorage(s3Client, 'd-reader-nft-data'));
  }

  async findMintedNfts() {
    try {
      const candyMachineId = new PublicKey(
        '3Umowr8NJLMra94hSvp56n6o5ysDbTvPwWpj36ggqU1w',
      );
      const candyMachineCreator = PublicKey.findProgramAddress(
        [Buffer.from('candy_machine'), candyMachineId.toBuffer()],
        this.metaplex.programs().getCandyMachine().address,
      );
      const mints = this.getMintAddresses(candyMachineCreator[0]);
      console.log(mints);
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
  // TODO: If this is the first comic issue from the comic, create a new ComicCollectionNFT
  // This NFT would serve as a root NFT, a collection of collections (comic issues)
  // https://docs.metaplex.com/programs/token-metadata/certified-collections#nested-collections
  async createComicIssueCM(
    comic: Comic,
    comicIssue: ComicIssue,
    creator: Creator,
  ) {
    const coverImage = await this.generateMetaplexFileFromS3(comicIssue.cover);

    const collectionNft = await this.createComicIssueCollectionNft(
      comicIssue,
      coverImage,
    );

    try {
      const comicCreator = new PublicKey(creator.walletAddress);

      const { candyMachine } = await this.metaplex.candyMachines().create(
        {
          candyMachine: Keypair.generate(), // v2: prefix key with 'cndy'
          authority: this.metaplex.identity(),
          collection: {
            address: collectionNft.address,
            updateAuthority: this.metaplex.identity(),
          },
          symbol: D_PUBLISHER_SYMBOL,
          maxEditionSupply: toBigNumber(0),
          isMutable: true,
          sellerFeeBasisPoints: SECONDARY_SALE_TAX,
          itemsAvailable: toBigNumber(comicIssue.supply),
          // groups: [], // v2: add different groups
          guards: {
            botTax: { lamports: sol(GLOBAL_BOT_TAX), lastInstruction: false },
            solPayment: {
              amount: sol(comicIssue.mintPrice),
              destination: this.metaplex.identity().publicKey,
            },
            tokenPayment: undefined,
            startDate: { date: toDateTime(comicIssue.releaseDate) },
            endDate: undefined, // v2: close mints after a long period of stale sales?
            thirdPartySigner: { signerKey: this.metaplex.identity().publicKey }, // v2: do we really need this?
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

      const sharedMetadata = await this.createComicIssueSharedNftMetadata(
        comic,
        comicIssue,
        creator,
        coverImage,
      );

      // TODO: Use lookup tables to be able to properly create 10 or more items for the candy machine
      // https://docs.solana.com/es/proposals/transactions-v2
      // ctrl+f 'transaction too large' in the metaplex discord for more details
      const indexArray = Array.from(Array(comicIssue.supply).keys());
      const items = await Promise.all(
        indexArray.map((index) => ({
          uri: sharedMetadata.uri,
          // TODO: test if this is actually indexing or if it's done automatically
          name: `${sharedMetadata.name} #${index + 1}`,
        })),
      );

      await this.metaplex.candyMachines().insertItems({
        candyMachine: candyMachine,
        items,
      });

      return await this.metaplex.candyMachines().refresh(candyMachine);
    } catch (e) {
      throw new BadRequestException(
        `Error while trying to create the CandyMachine: ${e}`,
        e,
      );
    }
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
          // external_url: undefined, // v2: point to https://dreader.app/comic-issues/{comicIssue.id}
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

  async createComicIssueSharedNftMetadata(
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
        // external_url: undefined, // v2: point to https://dreader.app/comic-issues/{comicIssue.id}
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
        e,
      );
    }
  }

  async mintOne() {
    const candyMachine = await this.metaplex.candyMachines().findByAddress({
      address: new PublicKey('9Z76zEyYT1GS6pMcUP4TLVQcLWiySyURKsgw9cRnQakn'),
    });

    const mintNftResponse = await this.metaplex.candyMachines().mint({
      candyMachine,
      guards: {
        thirdPartySigner: { signer: this.metaplex.identity() },
      },
      collectionUpdateAuthority: this.metaplex.identity().publicKey,
    });

    console.log('********** NFT Minted **********');
    console.log(mintNftResponse.tokenAddress);
  }

  // TODO: needs to be fixed like the function below
  async createMintTransaction(
    feePayer: PublicKey,
    blockhash?: BlockhashWithExpiryBlockHeight,
  ) {
    const candyMachine = await this.metaplex.candyMachines().findByAddress({
      address: new PublicKey('8AmS1kC56CjC5ANeH9iMSUU1zrqVhTEZGypiFge9VPwY'),
    });

    const mintTransactionBuilder = await this.metaplex
      .candyMachines()
      .builders()
      .mint(
        {
          candyMachine,
          collectionUpdateAuthority: this.metaplex.identity().publicKey,
        },
        // {
        //   payer: feePayer,
        // },
      );

    if (!blockhash) blockhash = await this.connection.getLatestBlockhash();
    const mintTransaction = mintTransactionBuilder.toTransaction(blockhash);

    mintTransaction.partialSign(this.metaplex.identity());
    console.log('********** NFT Mint Instruction created **********');

    // return bs58.encode(mintTransaction.serialize());

    return bs58.encode(
      mintTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }),
    );
  }

  async createNftTransaction(
    tokenOwner: PublicKey,
    blockhash?: BlockhashWithExpiryBlockHeight,
  ) {
    const imageFileBuffer = readFileSync(
      process.cwd() + '/src/vendors/logo.webp',
    );

    const { uri } = await this.metaplex.nfts().uploadMetadata({
      name: 'Temp NFT',
      symbol: 'dReader Test',
      description: 'This NFT was created for PoC purposes',
      seller_fee_basis_points: 200,
      image: toMetaplexFile(imageFileBuffer, 'image.jpg'),
    });

    const mintKeypair = Keypair.generate();
    const createNftBuilder = await this.metaplex
      .nfts()
      .builders()
      .create(
        {
          uri,
          name: 'Temp NFT',
          sellerFeeBasisPoints: 200,
          useNewMint: mintKeypair,
          tokenExists: false,
          tokenOwner,
        },
        { payer: { publicKey: tokenOwner } as IdentitySigner },
      );

    if (!blockhash) blockhash = await this.connection.getLatestBlockhash();
    createNftBuilder.setFeePayer({ publicKey: tokenOwner } as IdentitySigner);
    const createNftTransaction = createNftBuilder.toTransaction(blockhash);
    createNftTransaction.partialSign(this.metaplex.identity());
    createNftTransaction.partialSign(mintKeypair);

    const rawTransaction = createNftTransaction.serialize({
      requireAllSignatures: false,
    });

    // return bs58.encode(rawTransaction);
    return rawTransaction.toString('base64');
  }

  async generateMetaplexFileFromS3(key: string) {
    const getCoverFromS3 = await getS3Object({ Key: key });
    const coverImage = await streamToString(getCoverFromS3.Body as Readable);
    const coverImageFileName = 'cover' + path.extname(key);
    return toMetaplexFile(coverImage, coverImageFileName);
  }
}
