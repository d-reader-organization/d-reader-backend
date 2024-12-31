import { Cluster, clusterApiUrl } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { sol } from '@metaplex-foundation/js';
import { generateSecret, createWallet } from '../utils/wallet';
import { Cluster as ClusterEnum } from '../types/cluster';
import { cb, cg, cgray, cuy, log, logEnv, logErr } from './chalk';
import { sleep } from '../utils/helpers';
import { initMetaplex } from '../utils/metaplex';

interface Options {
  cluster: Cluster;
  heliusApiKey: string;
}

@Command({
  name: 'generate-environment',
  description: 'Generate necessary environment variables and wallets',
})
export class GenerateEnvironmentCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('generate-environment', options);
    await this.generateEnvironment(options);
  }

  generateEnvironment = async (options: Options) => {
    log('\n🏗️  Generating new .env values...\n');

    const endpoint = clusterApiUrl(options.cluster);
    const treasury = createWallet();
    const metaplex = initMetaplex(endpoint);

    if (metaplex.cluster !== ClusterEnum.MainnetBeta) {
      try {
        log(cb('🪂 Airdropping SOL'));
        await metaplex.rpc().airdrop(treasury.keypair.publicKey, sol(2));
        await sleep(2000);
        log(`✅ Airdropped ${cuy('2 Sol')} to the treasury...`);
      } catch (e) {
        logErr('Failed to airdrop Sol to the treasury!');
        log(cuy('Try airdropping manually on ', cb('https://solfaucet.com')));
      }
    }

    const treasurySecretKey = `[${treasury.keypair.secretKey.toString()}]`;
    const signMessagePrompt =
      'Sign this message for authenticating with your wallet: ';

    log('\n⚠️  Save these values in a text file or sticky notes');
    log('----------------------------------------------------');
    log('Treasury address:', cg(treasury.address));
    log('Treasury secret key:', cgray(treasurySecretKey));

    log('\n⚠️  Replace .env placeholder values with these below');
    log('----------------------------------------------------');
    logEnv('JWT_ACCESS_SECRET', generateSecret(42));
    logEnv('JWT_REFRESH_SECRET', generateSecret(42));
    logEnv('SOLANA_CLUSTER', metaplex.cluster);
    logEnv('TREASURY_PRIVATE_KEY', treasury.encryptedPrivateKey);
    logEnv('TREASURY_SECRET', treasury.secret);
    logEnv('SIGN_MESSAGE', signMessagePrompt);
    logEnv('HELIUS_API_KEY', options.heliusApiKey);
    logEnv('WEBHOOK_ID', 'REPLACE_THIS');

    if (metaplex.cluster === ClusterEnum.MainnetBeta) {
      logErr(
        `Please run the ${cg(
          "'yarn create-ah'",
        )} command in order to create an auction house.\nMake sure to top up the treasury wallet with a small amount of Sol`,
      );
    }

    log(
      `\n⚠️  Don't forget to run the ${cg(
        "'yarn sync-webhook'",
      )} command to create a new webhook`,
    );

    log(cg('\n💻 Happy hacking! \n'));
    return;
  };
}
