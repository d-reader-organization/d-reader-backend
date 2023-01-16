import { Cluster, Connection, Keypair } from '@solana/web3.js';
import { Command, CommandRunner } from 'nest-commander';
import {
  keypairIdentity,
  Metaplex,
  MetaplexError,
  sol,
  WRAPPED_SOL_MINT,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { Cluster as ClusterEnum } from '../types/cluster';

@Command({
  name: 'create-auction-house',
  description: 'Create a new auction house which is to be used within the app',
})
export class CreateAuctionHouseCommand extends CommandRunner {
  private readonly cluster: Cluster;
  private readonly connection: Connection;
  private readonly metaplex: Metaplex;

  constructor() {
    super();

    this.cluster = process.env.SOLANA_CLUSTER as Cluster;
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
  }

  async run(): Promise<void> {
    this.createAuctionHouse();
  }

  async createAuctionHouse() {
    // TODO: https://docs.metaplex.com/programs/auction-house/how-to-guides/manage-auction-house-using-cli
    console.log('Creating new auction house...');

    try {
      const response = await this.metaplex.auctionHouse().create({
        sellerFeeBasisPoints: 800, // 8%
        requiresSignOff: true,
        canChangeSalePrice: false,
        treasuryMint: WRAPPED_SOL_MINT,
        authority: this.metaplex.identity(),
        feeWithdrawalDestination: this.metaplex.identity().publicKey,
        treasuryWithdrawalDestinationOwner: this.metaplex.identity().publicKey,
        auctioneerAuthority: undefined, // out of scope for now
        auctioneerScopes: undefined,
      });

      const { auctionHouse } = response;

      const REPLACE_IN_ENV = {
        AUCTION_HOUSE_ADDRESS: auctionHouse.address,
      };

      if (this.cluster !== ClusterEnum.MainnetBeta) {
        console.log(
          'Airdropping 2 Sol to the auction house fee account wallet...',
        );
        try {
          await this.metaplex
            .rpc()
            .airdrop(auctionHouse.feeAccountAddress, sol(2));
        } catch (e) {
          console.log('ERROR: Failed to airdrop 2 Sol!');
        }
      }

      console.log('\n');
      console.log('**************************************************');
      console.log('Replace .env placeholder values with these below..');
      console.log('--------------------------------------------------');
      console.log(
        `AUCTION_HOUSE_ADDRESS="${REPLACE_IN_ENV.AUCTION_HOUSE_ADDRESS}"`,
      );

      return;
    } catch (error) {
      if (error instanceof MetaplexError) {
        const auctionHouse = await this.metaplex
          .auctionHouse()
          .findByCreatorAndMint({
            creator: this.metaplex.identity().publicKey,
            treasuryMint: WRAPPED_SOL_MINT,
          });

        console.log('Errored while creating the auction house!');
        console.log(
          `${this.metaplex
            .identity()
            .publicKey.toBase58()} already has AuctionHouse program assigned`,
        );
        console.log('AuctionHouse address: ', auctionHouse.address.toBase58());
        console.log(
          `Check it out on Explorer: https://explorer.solana.com/address/${auctionHouse.address.toBase58()}/anchor-account?cluster=${
            this.cluster
          }`,
        );
      } else {
        console.log('Errored while creating the auction house: ', error);
      }
    }
  }
}
