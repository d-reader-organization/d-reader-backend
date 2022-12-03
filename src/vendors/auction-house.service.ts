import { Injectable } from '@nestjs/common';
import { Connection, Keypair } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  // CreateAuctionHouseOutput,
  keypairIdentity,
  Metaplex,
  // Pda,
  // toBigNumber,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';

@Injectable()
export class AuctionHouseService {
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

    this.metaplex.use(keypairIdentity(treasuryKeypair));
    // .use(awsStorage(s3Client, 'd-reader-nft-data'));
  }

  async create() {
    try {
      const createAuctionHouseResponse = await this.metaplex
        .auctionHouse()
        .create({ sellerFeeBasisPoints: 200 });

      return createAuctionHouseResponse;
    } catch (e) {
      console.log('errored: ', e);
    }
  }

  async something() {
    try {
      // const fakeSeller = new PublicKey(
      //   '7aLBCrbn4jDNSxLLJYRRnKbkqA5cuaeaAzn74xS7eKPD',
      // );
      // const fakeMintAccount = new PublicKey(
      //   'HUXypHtrwM271dCL7CfoSb1ymMA5c9X5Ra6pGSEXUWV2',
      // );
      // const response = await this.metaplex.auctionHouse().list({
      //   seller: fakeSeller,
      //   mintAccount: fakeMintAccount,
      //   auctionHouse: {
      //     model: 'auctionHouse',
      //     address: new Pda('6ohKVf92BiVt3gUvD2Pn23XzYNkCxPu2D9unKr4dqXrG', 0),
      //     creatorAddress: new PublicKey(
      //       'AQbjzDPKnZrdH4HWVTC6oeu9odozyQn1BiEWXEcVUGCz',
      //     ),
      //     authorityAddress: new PublicKey(
      //       'AQbjzDPKnZrdH4HWVTC6oeu9odozyQn1BiEWXEcVUGCz',
      //     ),
      //     treasuryMint: {
      //       model: 'mint',
      //       address: new PublicKey(
      //         'So11111111111111111111111111111111111111112',
      //       ),
      //       mintAuthorityAddress: null,
      //       freezeAuthorityAddress: null,
      //       decimals: 9,
      //       supply: {
      //         basisPoints: toBigNumber(0),
      //         currency: {
      //           symbol: 'SOL',
      //           decimals: 9,
      //           namespace: 'spl-token',
      //         },
      //       },
      //       isWrappedSol: true,
      //       currency: {
      //         symbol: 'SOL',
      //         decimals: 9,
      //         namespace: 'spl-token',
      //       },
      //     },
      //   },
      // });
      // return response;
    } catch (e) {
      console.log('errored: ', e);
    }
  }
}
