import { Cluster, clusterApiUrl } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { cb, log } from './chalk';
import { getTreasuryPublicKey, initMetaplex, umi } from '../utils/metaplex';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { findAuctionHousePda, safeFetchAuctionHouse } from 'core-auctions';
import { publicKey } from '@metaplex-foundation/umi';

interface Options {
  cluster: Cluster;
}

@Command({
  name: 'create-auction-house',
  description:
    'Create Auction House from the treasury wallet specified in .env',
})
export class CreateAuctionHouseCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly auctionHouseService: AuctionHouseService,
  ) {
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

    const identityKey = metaplex.identity().publicKey;
    const authority = getTreasuryPublicKey();
    const auctionHouseAddress = findAuctionHousePda(umi, {
      creator: publicKey(authority),
      treasuryMint: publicKey(WRAPPED_SOL_MINT),
    })[0];
    const auctionHouseAccount = await safeFetchAuctionHouse(
      umi,
      auctionHouseAddress,
    );

    if (auctionHouseAccount) {
      log(`${identityKey.toBase58()} already has AuctionHouse assigned`);
      log(
        'Check it out on Explorer: ',
        cb(
          `https://explorer.solana.com/address/${auctionHouseAddress.toString()}/anchor-account?cluster=${
            metaplex.cluster
          }`,
        ),
      );
    }

    try {
      const response = await this.auctionHouseService.createAuctionHouse({
        treasuryMintAddress: WRAPPED_SOL_MINT.toString(),
        sellerFeeBasisPoints: 200, // 2%
        requiresSignOff: false,
        canChangeSalePrice: false,
      });

      const { address: auctionHouseAddress } = response;
      console.log('Successfully created auction house: ', auctionHouseAddress);
    } catch (error) {
      console.error('Failed to create the auction house!', error);
    }
  };
}
