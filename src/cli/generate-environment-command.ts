import { Cluster, clusterApiUrl } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import {
  Metaplex,
  MetaplexError,
  sol,
  WRAPPED_SOL_MINT,
} from '@metaplex-foundation/js';
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

    let auctionHouseAddress = 'REPLACE_THIS';
    // on mainnet we cannot airdrop sol and thus create the Auction House
    if (metaplex.cluster !== ClusterEnum.MainnetBeta) {
      auctionHouseAddress = await this.createAuctionHouse(metaplex);
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
    logEnv('AUCTION_HOUSE_ADDRESS', auctionHouseAddress);
    logEnv('SIGN_MESSAGE', signMessagePrompt);
    logEnv('HELIUS_API_KEY', options.heliusApiKey);
    logEnv('WEBHOOK_ID', 'REPLACE_THIS');
    logEnv('DARKBLOCK_API', 'REPLACE_THIS');

    if (metaplex.cluster === ClusterEnum.MainnetBeta) {
      logErr(
        `Please run the ${cg(
          "'yarn create-auction-house'",
        )} command in order to create an auction house.\nMake sure to top up the treasury wallet with a small amount of Sol`,
      );
    }

    log(
      `\n⚠️  Don't forget to run the ${cg(
        "'yarn sync-webhook'",
      )} command to create a new webhook`,
    );

    log(
      `\n⚠️  To generate a Darkblock API key visit ${cg(
        'https://darkblock.redoc.ly/apikey',
      )}`,
    );

    log(cg('\n💻 Happy hacking! \n'));
    return;
  };

  async createAuctionHouse(metaplex: Metaplex) {
    // https://docs.metaplex.com/programs/auction-house/how-to-guides/manage-auction-house-using-cli
    log('\n🏗️  Creating new auction house...');

    const identityKey = metaplex.identity().publicKey;

    try {
      const response = await metaplex.auctionHouse().create({
        sellerFeeBasisPoints: 200, // 2%
        requiresSignOff: false,
        canChangeSalePrice: false,
        treasuryMint: WRAPPED_SOL_MINT,
        authority: metaplex.identity(),
        feeWithdrawalDestination: identityKey,
        treasuryWithdrawalDestinationOwner: identityKey,
        auctioneerAuthority: undefined, // out of scope for now
        auctioneerScopes: undefined,
      });

      const { auctionHouse } = response;

      if (metaplex.cluster !== ClusterEnum.MainnetBeta) {
        try {
          log(cb('🪂 Airdropping SOL'));
          await sleep(8000);
          await metaplex.rpc().airdrop(auctionHouse.address, sol(2));
          log(`✅ Airdropped ${cuy('2 Sol')} to the auction house...`);
        } catch (e) {
          logErr('Failed to airdrop Sol to the auction house!');
          log(cuy('Try airdropping manually on ', cb('https://solfaucet.com')));
        }
      }

      return auctionHouse.address.toBase58();
    } catch (error) {
      logErr('Failed to create the auction house!');

      if (error instanceof MetaplexError) {
        const auctionHouse = await metaplex
          .auctionHouse()
          .findByCreatorAndMint({
            creator: identityKey,
            treasuryMint: WRAPPED_SOL_MINT,
          });

        log(`${identityKey.toBase58()} already has AuctionHouse assigned`);
        log('AuctionHouse address: ', cuy(auctionHouse.address.toBase58()));
        log(
          'Check it out on Explorer: ',
          cb(
            `https://explorer.solana.com/address/${auctionHouse.address.toBase58()}/anchor-account?cluster=${
              metaplex.cluster
            }`,
          ),
        );
      } else log(error);
    }
  }
}
