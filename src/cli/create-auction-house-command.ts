import { Cluster, clusterApiUrl } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { MetaplexError, sol, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { Cluster as ClusterEnum } from '../types/cluster';
import { cb, cuy, log, logEnv, logErr } from './chalk';
import { sleep } from '../utils/helpers';
import { initMetaplex } from '../utils/metaplex';

interface Options {
  cluster: Cluster;
}

@Command({
  name: 'create-auction-house',
  description:
    'Create Auction House from the treasury wallet specified in .env',
})
export class CreateAuctionHouseCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('create-auction-house', options);
    await this.createAuctionHouse(options);
  }

  createAuctionHouse = async (options: Options) => {
    // https://docs.metaplex.com/programs/auction-house/how-to-guides/manage-auction-house-using-cli
    log('\n🏗️  Creating new auction house...');

    const endpoint = clusterApiUrl(options.cluster);
    const metaplex = initMetaplex(endpoint);

    if (metaplex.cluster !== ClusterEnum.MainnetBeta) {
      try {
        log(cb('🪂 Airdropping SOL'));
        await metaplex.rpc().airdrop(metaplex.identity().publicKey, sol(2));
        await sleep(2000);
        log(`✅ Airdropped ${cuy('2 Sol')} to the treasury...`);
      } catch (e) {
        logErr('Failed to airdrop Sol to the treasury!');
        log(cuy('Try airdropping manually on ', cb('https://solfaucet.com')));
      }
    }

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

      log('\n⚠️  Replace .env placeholder values with these below');
      log('----------------------------------------------------');
      logEnv('AUCTION_HOUSE_ADDRESS', auctionHouse.address.toBase58());
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
  };
}
