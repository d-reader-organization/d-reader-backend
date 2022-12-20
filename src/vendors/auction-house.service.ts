import { Injectable } from '@nestjs/common';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import { keypairIdentity, Metaplex, sol } from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { Cluster } from 'src/types/cluster';

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
    // this.metaplex.use()
    // .use(awsStorage(s3Client, 'd-reader-nft-data'));
  }

  async createAuctionHouse() {
    try {
      const response = await this.metaplex.auctionHouse().create({
        sellerFeeBasisPoints: 200,
        // auctioneerAuthority: this.metaplex.identity().publicKey,
      });

      const { auctionHouse } = response;

      if (process.env.SOLANA_CLUSTER !== Cluster.MainnetBeta) {
        await this.metaplex
          .rpc()
          .airdrop(auctionHouse.feeAccountAddress, sol(2));
      }

      return response;
    } catch (e) {
      console.log('Errored while creating the auction house: ', e);
    }
  }

  async findOurAuctionHouse() {
    const address = new PublicKey('something');
    return this.metaplex.auctionHouse().findByAddress({ address });
  }

  async withdrawFundsFromFeeWallet(amount: number) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();

      const response = await this.metaplex
        .auctionHouse()
        .withdrawFromFeeAccount({
          auctionHouse,
          amount: sol(amount),
        });

      return response;
    } catch (e) {
      console.log('Errored while withdrawing funds from the fee wallet: ', e);
    }
  }

  async withdrawFundsFromTreasuryWallet(amount: number) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
      const response = await this.metaplex
        .auctionHouse()
        .withdrawFromTreasuryAccount({
          auctionHouse,
          amount: sol(amount),
        });

      return response;
    } catch (e) {
      console.log(
        'Errored while withdrawing funds from the treasury wallet: ',
        e,
      );
    }
  }
}
