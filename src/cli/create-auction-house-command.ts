import { Cluster, clusterApiUrl, Connection } from '@solana/web3.js';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Metaplex, sol } from '@metaplex-foundation/js';

interface CreateAuctionHouseCommandOptions {
  cluster?: Cluster;
}

@Command({
  name: 'create-auction-house',
  description: 'Create a new auction house which is to be used within the app',
})
export class CreateAuctionHouseCommand extends CommandRunner {
  async run(
    passedParam: string[],
    options: CreateAuctionHouseCommandOptions,
  ): Promise<void> {
    options.cluster = options.cluster || 'devnet';
    this.createAuctionHouse(options.cluster);
  }

  @Option({
    flags: '-c, --cluster [string]',
    description:
      "Solana cluster to use, select 'devnet' for local development or 'mainnet-beta' for production environment",
  })
  parseCluster(cluster: string): string {
    if (cluster !== 'devnet' && cluster !== 'mainnet-beta') {
      throw new Error(
        "Faulty --cluster argument, only 'devnet' and 'mainnet-beta' are allowed",
      );
    }

    return cluster;
  }

  async createAuctionHouse(cluster: Cluster) {
    const endpoint = clusterApiUrl(cluster);
    const connection = new Connection(endpoint, 'confirmed');
    const metaplex = new Metaplex(connection);

    // TODO: https://docs.metaplex.com/programs/auction-house/how-to-guides/manage-auction-house-using-cli

    try {
      const response = await metaplex.auctionHouse().create({
        sellerFeeBasisPoints: 200,
        // I don't think we want auctioneer functionality (yet!)
        // auctioneerAuthority: this.metaplex.identity().publicKey,
      });

      const { auctionHouse } = response;

      if (process.env.SOLANA_CLUSTER !== 'mainnet-beta') {
        metaplex.rpc().airdrop(auctionHouse.feeAccountAddress, sol(2));
      }

      console.log(response);
      return;
    } catch (e) {
      console.log('Errored while creating the auction house: ', e);
    }
  }
}
