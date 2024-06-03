import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import axios, { AxiosError } from 'axios';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { TENSOR_GRAPHQL_API_ENDPOINT } from '../constants';

interface Options {
  nftAddress: string;
}

@Command({
  name: 'sync-listings',
  description: 'sync the all the listings of a collection from Tensor',
})
export class SyncListingsCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly auctionHouseService: AuctionHouseService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('sync-listings', options);
    await this.syncListings(options);
  }

  syncListings = async (options: Options) => {
    log('\n🏗️  Syncing listings...');

    const { nftAddress } = options;
    let collectionSlug: string;
    try {
      const { data: tokenSlugResponse } = await axios.post(
        TENSOR_GRAPHQL_API_ENDPOINT,
        {
          query: `query Mints($tokenMints: [String!]!) {
          mints(tokenMints: $tokenMints) {
            slug
          }
        }`,
          variables: {
            tokenMints: [nftAddress],
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-TENSOR-API-KEY': process.env.TENSOR_API_KEY ?? '',
          },
        },
      );
      collectionSlug = tokenSlugResponse.data.mints.at(-1).slug;
      console.log(collectionSlug);
    } catch (e) {
      console.error(e);
    }

    let hasMore = true;
    let endCursor: string = null;
    let curr = 0;
    while (hasMore) {
      console.log(`Fetching listings ${curr} - ${curr + 100}`);
      const { data } = await fetchTensorListings(collectionSlug, endCursor);
      const activeListings = data.activeListingsV2;
      console.log(activeListings);
      endCursor = activeListings.page.endCursor.str;
      hasMore = activeListings.page.hasMore;
      curr += activeListings.txs.length;
      await this.auctionHouseService.syncListings(activeListings.txs);
    }

    try {
    } catch (error) {
      logErr(`Error syncing collction: ${error}`);
    }
    log('\n');
  };
}

async function fetchTensorListings(slug: string, endCursor: string) {
  try {
    const { data } = await axios.post(
      TENSOR_GRAPHQL_API_ENDPOINT,
      {
        query: `query ActiveListingsV2(
          $slug: String!
          $sortBy: ActiveListingsSortBy!
          $filters: ActiveListingsFilters
          $limit: Int
          $cursor: ActiveListingsCursorInputV2
        ) {
          activeListingsV2(
            slug: $slug
            sortBy: $sortBy
            filters: $filters
            limit: $limit
            cursor: $cursor
          ) {
            page {
              endCursor {
                str
              }
              hasMore
            }
            txs {
              mint {
                onchainId
              }
              tx {
                sellerId
                grossAmount
                grossAmountUnit
                txId
                source
              }
            }
          }
        }`,
        variables: {
          slug,
          sortBy: 'PriceAsc',
          filters: {
            sources: ['TENSORSWAP', 'TCOMP'],
          },
          limit: 100,
          cursor: endCursor
            ? {
                str: endCursor,
              }
            : null,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-TENSOR-API-KEY': process.env.TENSOR_API_KEY ?? '',
        },
      },
    );
    return data;
  } catch (err: any) {
    if (err instanceof AxiosError) console.log(err.response?.data.errors);
    else console.error(err);
  }
}
