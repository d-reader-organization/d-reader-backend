import { Cluster, Connection, Keypair } from '@solana/web3.js';
import { Command, CommandRunner } from 'nest-commander';
import {
  keypairIdentity,
  Metaplex,
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
    try {
      const response = await this.metaplex.auctionHouse().create({
        sellerFeeBasisPoints: 800, // 8%
        requiresSignOff: true,
        canChangeSalePrice: false, // confirm if this will be 'false'
        treasuryMint: WRAPPED_SOL_MINT,
        authority: this.metaplex.identity(), // Keypair.generate()
        feeWithdrawalDestination: this.metaplex.identity().publicKey,
        treasuryWithdrawalDestinationOwner: this.metaplex.identity().publicKey,
        auctioneerAuthority: undefined, // out of scope for now
        auctioneerScopes: undefined,
      });

      const { auctionHouse } = response;

      if (this.cluster !== ClusterEnum.MainnetBeta) {
        this.metaplex.rpc().airdrop(auctionHouse.feeAccountAddress, sol(2));
      }

      // TODO: CONSOLE.LOG EVERYTHING, CONNECT WITH THE GENERATEENVIRONMENT FOR .ENV?
      console.log(response);
      return;
    } catch (e) {
      console.log('Errored while creating the auction house: ', e);
    }
  }
}
