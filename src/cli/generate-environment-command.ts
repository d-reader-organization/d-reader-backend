import { Cluster, clusterApiUrl, Connection } from '@solana/web3.js';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Metaplex, sol } from '@metaplex-foundation/js';
import { generateSecret, createWallet } from '../utils/wallets';
import { Cluster as ClusterEnum } from '../types/cluster';

interface GenerateEnvironmentCommandOptions {
  cluster?: Cluster;
}

@Command({
  name: 'generate-env',
  description: 'Generate necessary environment variables and wallets',
})
export class GenerateEnvironmentCommand extends CommandRunner {
  async run(
    passedParam: string[],
    options: GenerateEnvironmentCommandOptions,
  ): Promise<void> {
    options.cluster = options.cluster || ClusterEnum.Devnet;
    this.generateEnvironment(options.cluster);
  }

  @Option({
    flags: '-c, --cluster [string]',
    description:
      "Solana cluster to use, select 'devnet' for local development or 'mainnet-beta' for production environment",
  })
  parseCluster(cluster: string): string {
    if (cluster !== ClusterEnum.Devnet && cluster !== ClusterEnum.MainnetBeta) {
      throw new Error(
        "Faulty --cluster argument, only 'devnet' and 'mainnet-beta' are allowed",
      );
    }

    return cluster;
  }

  generateEnvironment = async (cluster: Cluster) => {
    console.log('Generating new .env values...');

    const endpoint = clusterApiUrl(cluster);
    const connection = new Connection(endpoint, 'confirmed');
    const metaplex = new Metaplex(connection);

    // Proposal: create a wallet with starting characters 'trsy...'
    const treasuryWallet = createWallet();

    if (cluster !== ClusterEnum.MainnetBeta) {
      console.log('Airdropping 2 Sol to the treasury wallet...');
      try {
        await metaplex.rpc().airdrop(treasuryWallet.keypair.publicKey, sol(2));
      } catch (e) {
        console.log('ERROR: Failed to airdrop 2 Sol!');
      }
    }

    const WRITE_ON_PAPER = {
      treasurySecretKey: `[${treasuryWallet.keypair.secretKey.toString()}]`,
    };

    const COPY_PASTE_SOMEWHERE = {
      treasuryAddress: treasuryWallet.address,
    };

    const REPLACE_IN_ENV = {
      JWT_ACCESS_SECRET: generateSecret(42),
      JWT_REFRESH_SECRET: generateSecret(42),
      SOLANA_CLUSTER: cluster,
      SOLANA_RPC_NODE_ENDPOINT: endpoint,
      SIGN_MESSAGE: 'Sign this message for authenticating with your wallet: ',
      TREASURY_PRIVATE_KEY: treasuryWallet.encryptedPrivateKey,
      TREASURY_SECRET: treasuryWallet.secret,
    };

    console.log('\n');
    console.log('**************************************************');
    console.log('WRITE THESE VALUES ON A SHEET OF PAPER AND HIDE IT');
    console.log('--------------------------------------------------');
    console.log('Treasury secret key:', WRITE_ON_PAPER.treasurySecretKey);
    console.log('**************************************************\n\n');

    console.log('**************************************************');
    console.log('Copy these values in a text file or sticky notes!!');
    console.log('--------------------------------------------------');
    console.log(
      'Treasury wallet address:',
      COPY_PASTE_SOMEWHERE.treasuryAddress,
    );
    console.log('**************************************************\n\n');

    console.log('**************************************************');
    console.log('Replace .env placeholder values with these below..');
    console.log('--------------------------------------------------');
    console.log(`JWT_ACCESS_SECRET="${REPLACE_IN_ENV.JWT_ACCESS_SECRET}"`);
    console.log(`JWT_REFRESH_SECRET="${REPLACE_IN_ENV.JWT_REFRESH_SECRET}"`);
    console.log(`SOLANA_CLUSTER="${REPLACE_IN_ENV.SOLANA_CLUSTER}"`);
    console.log(
      `SOLANA_RPC_NODE_ENDPOINT="${REPLACE_IN_ENV.SOLANA_RPC_NODE_ENDPOINT}"`,
    );
    console.log(`SIGN_MESSAGE="${REPLACE_IN_ENV.SIGN_MESSAGE}"`);
    console.log(
      `TREASURY_PRIVATE_KEY="${REPLACE_IN_ENV.TREASURY_PRIVATE_KEY}"`,
    );
    console.log(`TREASURY_SECRET="${REPLACE_IN_ENV.TREASURY_SECRET}"`);
    console.log('**************************************************\n');

    console.log(
      "In case you don't have an Auction House set up, make sure to run the `npm run create-ah` and follow instructions\n",
    );
    return;
  };
}
