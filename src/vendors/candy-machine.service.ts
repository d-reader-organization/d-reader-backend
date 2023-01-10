import { Injectable } from '@nestjs/common';
import {
  BlockhashWithExpiryBlockHeight,
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateNftOutput,
  IdentitySigner,
  keypairIdentity,
  Metaplex,
  toBigNumber,
  toMetaplexFile,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { readFileSync } from 'fs';
import { awsStorage } from '@metaplex-foundation/js-plugin-aws';
import { s3Client } from 'src/aws/s3client';
import * as bs58 from 'bs58';

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
      // const nfts = await this.metaplex.candyMachines().findMintedNfts({
      //   candyMachine: new PublicKey(
      //     '3Umowr8NJLMra94hSvp56n6o5ysDbTvPwWpj36ggqU1w',
      //   ),
      // });
      // TODO: this might not work? Is candy machine a creator?
      const nfts = await this.metaplex.candyMachinesV2().findMintedNfts({
        candyMachine: new PublicKey(
          '3Umowr8NJLMra94hSvp56n6o5ysDbTvPwWpj36ggqU1w',
        ),
      });

      // const nfts = await this.metaplex.nfts().findAllByCreator({
      //   creator: new PublicKey('3Umowr8NJLMra94hSvp56n6o5ysDbTvPwWpj36ggqU1w'),
      // });
      return nfts;
    } catch (e) {
      console.log('errored: ', e);
    }
  }

  // TODO: https://docs.metaplex.com/programs/token-metadata/certified-collections#nested-collections
  // Nest Collections (Comics can have multiple Comic Issues)
  async create() {
    let createCollectionNftResponse: CreateNftOutput;
    try {
      const imageFileBuffer = readFileSync(
        process.cwd() + '/src/vendors/logo.webp',
      );

      const { uri } = await this.metaplex.nfts().uploadMetadata({
        name: 'Narentines: The Origin',
        symbol: 'dReader',
        description: "'Narentines: The Origin' Collection NFT",
        seller_fee_basis_points: 1000,
        image: toMetaplexFile(imageFileBuffer, 'image.jpg'),
        // external_url: '',
      });

      createCollectionNftResponse = await this.metaplex.nfts().create({
        uri,
        name: 'Narentines: The Origin',
        sellerFeeBasisPoints: 1000,
        symbol: 'dReader',
        isCollection: true,
        collectionAuthority: this.metaplex.identity(),
      });
      console.log('********** Collection NFT created **********');
      console.log(createCollectionNftResponse.nft);
    } catch (e) {
      console.log('errored: ', e);
    }

    try {
      const fakeCreator = new PublicKey(
        '7aLBCrbn4jDNSxLLJYRRnKbkqA5cuaeaAzn74xS7eKPD',
      );

      let { candyMachine } = await this.metaplex.candyMachines().create(
        {
          candyMachine: Keypair.generate(), // TODO: generate a new keypair with 'cndy' prefix
          authority: this.metaplex.identity(), // TODO: might have to revise this if we will include Collection NFT
          collection: {
            address: createCollectionNftResponse.nft.address,
            updateAuthority: this.metaplex.identity(),
          },
          symbol: 'dReader',
          maxEditionSupply: toBigNumber(0),
          isMutable: true,
          sellerFeeBasisPoints: 1000,
          itemsAvailable: toBigNumber(10), // TODO: change thisto param.supply
          creators: [
            {
              address: this.metaplex.identity().publicKey,
              share: 10,
            },
            {
              address: fakeCreator, // Creator publicKey
              share: 90,
            },
          ],
        },
        {
          payer: this.metaplex.identity(), // In the future Creator might become the payer
          // wallet: this.metaplex.identity().publicKey, // TODO: this might be Creator wallet
          // tokenMint: null, // TODO: TOKEN_PROGRAM_ID? use SOL either way
          // retainAuthority: true,
          // goLiveDate: Date.now(), // TODO: change this to param.goLiveDate
          // endSettings: null, // Don't end the mint until all items have been minted
          // hiddenSettings: null,
          // whitelistMintSettings: null, // TODO: this should be updated dynamically to benefit holders of previous comic issues
          // gatekeeper: null, // TODO
          // price: sol(1), // TODO: change this to param.price
        },
      );

      const item1 = await this.createMetadata();
      const item2 = await this.createMetadata();
      const item3 = await this.createMetadata();
      const item4 = await this.createMetadata();
      await this.metaplex.candyMachines().insertItems({
        candyMachine: candyMachine,
        items: [item1, item2, item3, item4],
      });

      candyMachine = await this.metaplex.candyMachines().refresh(candyMachine);

      console.log('********** Candy Machine created **********');
      console.log(candyMachine);
      return candyMachine;
    } catch (e) {
      console.log('errored: ', e);
    }
  }

  async createMetadata() {
    try {
      const imageFileBuffer = readFileSync(
        process.cwd() + '/src/vendors/logo.webp',
      );

      const { uri, metadata } = await this.metaplex.nfts().uploadMetadata({
        name: 'Temp metadata',
        symbol: 'dReader',
        description: 'My metadata',
        seller_fee_basis_points: 1000,
        image: toMetaplexFile(imageFileBuffer, 'image.jpg'),
        // properties: {
        //   creators: []
        // }
        // external_url: '',
      });

      return { uri, name: metadata.name };
    } catch (e) {
      console.log('errored: ', e);
    }
  }

  async mintOne() {
    const candyMachine = await this.metaplex.candyMachines().findByAddress({
      address: new PublicKey('8AmS1kC56CjC5ANeH9iMSUU1zrqVhTEZGypiFge9VPwY'),
    });

    const mintNftResponse = await this.metaplex.candyMachines().mint({
      candyMachine,
      collectionUpdateAuthority: this.metaplex.identity().publicKey,
    });

    console.log('********** NFT Minted **********');
    console.log(mintNftResponse);
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
}
