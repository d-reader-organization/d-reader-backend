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
  toBigNumber,
  TransactionBuilder,
  MetaplexFile,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { awsStorage } from '@metaplex-foundation/js-plugin-aws';
import { s3Client } from '../aws/s3client';
import { ComicIssue } from '@prisma/client';
import { s3toMxFile } from '../utils/files';
import { constructMintInstruction } from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import { heliusClusterApiUrl } from 'helius-sdk';
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
  D_PUBLISHER_SECONDARY_SALE_SHARE,
} from '../constants';
import { solFromLamports } from '../utils/helpers';
import { createCandyMachine } from './instructions';

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

  async createComicIssueCM(
    comicIssue: ComicIssue,
    comicName: string,
    creatorAddress: string,
  ) {
    this.validateInput(comicIssue);

    // we can do this in parallel
    const coverImage = await s3toMxFile(comicIssue.cover, 'cover');
    const signedCoverImage = await s3toMxFile(
      comicIssue.signedCover,
      'signed-cover',
    );
    const usedCoverImage = await s3toMxFile(comicIssue.usedCover, 'used-cover');
    const usedSignedCoverImage = await s3toMxFile(
      comicIssue.usedSignedCover,
      'used-signed-cover',
    );

    // if Collection NFT already exists - use it, otherwise create a fresh one
    let collectionNftAddress: PublicKey;
    const collectionNft = await this.prisma.collectionNft.findUnique({
      where: { comicIssueId: comicIssue.id },
    });

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
              signedCoverImage,
              usedCoverImage,
              usedSignedCoverImage,
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
    const candyMachineKey = Keypair.generate();
    const authorityKey = this.metaplex.identity();
    const comicCreator = new PublicKey(creatorAddress);
    const createCandyMachineInstruction = await createCandyMachine(
      this.metaplex,
      {
        candyMachine: {
          address: candyMachineKey.publicKey,
          authority: authorityKey.publicKey,
        },
        collection: {
          updateAuthority: authorityKey.publicKey,
          mint: collectionNftAddress,
        },
        payer: authorityKey.publicKey,
      },
      {
        creators: [{ address: comicCreator, share: HUNDRED }],
        itemsAvailable: toBigNumber(comicIssue.supply),
        sellerFeeBasisPoints: comicIssue.sellerFeeBasisPoints,
        maxEditionSupply: toBigNumber(0),
        symbol: D_PUBLISHER_SYMBOL,
        isMutable: true,
      },
      {
        solPayment: {
          amount: solFromLamports(comicIssue.mintPrice),
          destination: this.metaplex.identity().publicKey,
        },
      },
    );
    const createCandyMachineTransaction = new Transaction().add(
      ...createCandyMachineInstruction,
    );
    await sendAndConfirmTransaction(
      this.metaplex.connection,
      createCandyMachineTransaction,
      [authorityKey, candyMachineKey],
    );

    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineKey.publicKey });

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
          creators: [
            {
              address: this.metaplex.identity().publicKey.toBase58(),
              share: D_PUBLISHER_SECONDARY_SALE_SHARE,
            },
            {
              address: creatorAddress,
              share: HUNDRED - D_PUBLISHER_SECONDARY_SALE_SHARE,
            },
          ],
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
    const items = await Promise.all(
      indexArray.map((index) => ({
        uri: metadataUri,
        name: `${metadata.name} #${index + 1}`,
      })),
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

  validateInput(comicIssue: ComicIssue) {
    if (comicIssue.supply <= 0) {
      throw new BadRequestException(
        'Cannot create an NFT collection with supply lower than 1',
      );
    }
    if (comicIssue.discountMintPrice > comicIssue.mintPrice) {
      throw new BadRequestException(
        'Discount mint price should be lower than base mint price',
      );
    } else if (comicIssue.discountMintPrice < 0 || comicIssue.mintPrice < 0) {
      throw new BadRequestException(
        'Mint prices must be greater than or equal to 0',
      );
    }
    if (!comicIssue.cover) {
      throw new BadRequestException('Missing cover image');
    }
    if (!comicIssue.signedCover) {
      throw new BadRequestException('Missing signed cover image');
    }
    if (!comicIssue.usedCover) {
      throw new BadRequestException('Missing used cover image');
    }
    if (!comicIssue.usedSignedCover) {
      throw new BadRequestException('Missing used & signed cover image');
    }
    if (
      comicIssue.sellerFeeBasisPoints < 0 ||
      comicIssue.sellerFeeBasisPoints > 10000
    ) {
      throw new BadRequestException('Invalid seller fee value');
    }
  }

  writeFiles(...files: MetaplexFile[]) {
    return files.map((file) => ({
      uri: file,
      type: file.contentType,
    }));
  }
}
