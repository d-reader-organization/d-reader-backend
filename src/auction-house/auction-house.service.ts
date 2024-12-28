import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Metaplex } from '@metaplex-foundation/js';
import {
  createBidTransaction,
  createCancelBidTransaction,
  createCancelListingTransaction,
  createSellTransaction,
  createTimedAuctionSellTransaction,
  createAuctionHouse,
  createExecuteSaleTransaction,
  createInitEditionSaleTransaction,
  createInstantBuyTransaction,
  createRepirceListingTransaction,
} from './instructions';
import { PrismaService } from 'nestjs-prisma';
import { CollectonMarketplaceStats } from './dto/types/collection-marketplace-stats';
import {
  ListingFilterParams,
  ListingSortTag,
} from './dto/listing-fliter-params.dto';
import { isBoolean, isEmpty, isEqual, sortBy } from 'lodash';
import { InstantBuyArgs } from './dto/types/instant-buy-args';
import {
  getIdentityUmiSignature,
  getTreasuryPublicKey,
  metaplex,
  umi,
} from '../utils/metaplex';
import { Scope, Source } from 'helius-sdk';
import { SortOrder } from '../types/sort-order';
import {
  LOCKED_COLLECTIONS,
  MIN_COMPUTE_PRICE,
  RARITY_PRECEDENCE,
  TCOMP_PROGRAM_ID,
  TENSOR_MAINNET_API_ENDPOINT,
  TSWAP_PROGRAM_ID,
} from '../constants';
import { TENSOR_LISTING_RESPONSE } from './dto/types/tensor-listing-response';
import axios from 'axios';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { TokenStandard } from '@prisma/client';
import {
  fetchTensorBuyTx,
  findOurCandyMachine,
  getAsset,
  getTransactionWithPriorityFee,
} from '../utils/das';
import { HeliusService } from '../webhooks/helius/helius.service';
import { findAuctionHousePda } from 'core-auctions';
import { publicKey, Umi } from '@metaplex-foundation/umi';
import { CreateAuctionHouseDto } from './dto/create-auction-house.dto';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { ListParams, TimedAuctionListParams } from './dto/list-params.dto';
import { BidParams } from './dto/bid-params.dto';
import { ExecuteSaleParams } from './dto/execute-sale-params.dto';
import {
  assertPrintEditionSaleConfig,
  assertListingConfig,
} from '../utils/auction-house';
import { memoizeThrottle } from '../utils/lodash';
import { InitializePrintEditionSaleParams } from './dto/initialize-edition-sale-params.dto';
import { createBuyPrintEditionTransaction } from './instructions/buy-edition';
import { BuyPrintEditionParams } from './dto/buy-print-edition-params';
import { RepriceListingParams } from './dto/reprice-listing-params.dto';
import { ProgramSource } from '../types/shared';
import { hours } from '@nestjs/throttler';

@Injectable()
export class AuctionHouseService {
  private readonly umi: Umi;
  private readonly metaplex: Metaplex;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {
    this.umi = umi;
    this.metaplex = metaplex;
  }

  private async getAuctionHouse(splTokenAddress: string) {
    const auctionHouse = await this.prisma.auctionHouse.findFirst({
      where: { treasuryMint: splTokenAddress },
    });

    if (!auctionHouse) {
      throw new BadRequestException(
        `Selected currency not supported: ${splTokenAddress}`,
      );
    }

    return auctionHouse;
  }

  private throttledFindAuctionHouse = memoizeThrottle(
    async (splTokenAddress: string) => {
      const auctionHouse = await this.getAuctionHouse(splTokenAddress);
      return auctionHouse;
    },
    hours(24),
  );

  private async getBasicAssetData(address: string) {
    const digitalAsset = await this.prisma.digitalAsset.findUnique({
      where: { address },
      include: {
        collectibleComic: true,
        printEdition: true,
        oneOfOne: true,
      },
    });

    if (!digitalAsset) {
      throw new NotFoundException(
        "Asset doesn't exist, try syncing your assets",
      );
    }

    const { collectibleComic, printEdition, oneOfOne } = digitalAsset;

    if (collectibleComic) {
      const candyMachine = await this.prisma.candyMachine.findFirst({
        where: {
          collection: {
            metadatas: {
              some: {
                collectibleComics: {
                  some: { address: collectibleComic.address },
                },
              },
            },
          },
        },
      });

      if (candyMachine?.standard !== TokenStandard.Core) {
        throw new BadRequestException(
          `${candyMachine?.standard} Token standard is not supported for auctions`,
        );
      }

      return {
        sellerAddress: digitalAsset.ownerAddress,
        assetAddress: collectibleComic.address,
        collectionAddress: candyMachine.collectionAddress,
      };
    }

    if (printEdition) {
      return {
        sellerAddress: digitalAsset.ownerAddress,
        assetAddress: printEdition.address,
        collectionAddress: printEdition.collectionAddress,
      };
    }

    if (oneOfOne) {
      return {
        sellerAddress: digitalAsset.ownerAddress,
        assetAddress: oneOfOne.address,
        collectionAddress: oneOfOne.collectionAddress,
      };
    }

    throw new NotFoundException(
      'Digital asset is either invalid or not supported for listing',
    );
  }

  async createAuctionHouse(createAuctionHouseDto: CreateAuctionHouseDto) {
    const transaction = await createAuctionHouse(
      this.umi,
      createAuctionHouseDto,
    );
    const signedTransaction = await getIdentityUmiSignature(transaction);

    const latestBlockhash = await this.umi.rpc.getLatestBlockhash({
      commitment: 'confirmed',
    });
    const signature = await this.umi.rpc.sendTransaction(signedTransaction, {
      commitment: 'confirmed',
    });

    await this.umi.rpc.confirmTransaction(signature, {
      commitment: 'confirmed',
      strategy: { type: 'blockhash', ...latestBlockhash },
    });

    const authority = getTreasuryPublicKey();
    const {
      canChangeSalePrice,
      requiresSignOff,
      treasuryMintAddress,
      sellerFeeBasisPoints,
    } = createAuctionHouseDto;

    const treasuryMint = publicKey(treasuryMintAddress);
    const auctionHouseAddress = findAuctionHousePda(this.umi, {
      authority: fromWeb3JsPublicKey(authority),
      treasuryMint,
    });

    await this.heliusService.subscribeTo(auctionHouseAddress.toString());

    return await this.prisma.auctionHouse.create({
      data: {
        address: auctionHouseAddress[0],
        canChangeSalePrice: canChangeSalePrice ?? false,
        sellerFeeBasisPoints,
        requiresSignOff: requiresSignOff ?? false,
        treasuryMint: treasuryMintAddress,
      },
    });
  }

  /* List your asset for timed auction */
  async timedAuctionList(params: TimedAuctionListParams) {
    const { startDate, endDate, assetAddress, splTokenAddress } = params;

    if (endDate < startDate) {
      throw new BadRequestException(
        'End Date cannot be earlier than Start Date',
      );
    }

    const { sellerAddress, collectionAddress } = await this.getBasicAssetData(
      assetAddress,
    );
    const auctionHouse = await this.getAuctionHouse(splTokenAddress);

    return getTransactionWithPriorityFee(
      createTimedAuctionSellTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      assetAddress,
      sellerAddress,
      auctionHouse.address,
      params,
      collectionAddress,
    );
  }

  /* List your asset at a constant price */
  async list(params: ListParams) {
    const { assetAddress, price, splTokenAddress } = params;

    const auctionHouse = await this.getAuctionHouse(splTokenAddress);
    const { sellerAddress, collectionAddress } = await this.getBasicAssetData(
      assetAddress,
    );

    return getTransactionWithPriorityFee(
      createSellTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      assetAddress,
      sellerAddress,
      auctionHouse.address,
      price,
      collectionAddress,
    );
  }

  /* Bid on a listed digital asset */
  async bid(bidParams: BidParams) {
    const { bidderAddress, assetAddress, price } = bidParams;

    const { auctionHouse, ...listing } = await this.prisma.listing.findUnique({
      where: {
        assetAddress_closedAt: {
          assetAddress,
          closedAt: new Date(0),
        },
      },
      include: {
        auctionHouse: true,
        listingConfig: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Asset is not listed for auction');
    }

    const isTimedAuction = !isEmpty(listing.listingConfig);
    if (isTimedAuction) {
      const listingConfig = listing.listingConfig;
      const highestBid = listingConfig.highestBidId
        ? await this.prisma.bid.findUnique({
            where: { id: listingConfig.highestBidId },
          })
        : undefined;
      assertListingConfig(listingConfig, price, highestBid);
    }

    const transaction = await getTransactionWithPriorityFee(
      createBidTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      auctionHouse.address,
      assetAddress,
      bidderAddress,
      auctionHouse.treasuryMint,
      price,
      isTimedAuction,
    );
    return transaction;
  }

  /* Execute sale with listing and bid orders */
  async executeSale(executeSaleParams: ExecuteSaleParams) {
    const { listingId, bidId } = executeSaleParams;

    const { auctionHouse, ...listing } = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { auctionHouse: true, listingConfig: true },
    });
    const bid = await this.prisma.bid.findUnique({ where: { id: bidId } });

    if (!listing) {
      throw new NotFoundException(
        'Failed to execute the sale, listing for the asset not found',
      );
    }

    if (!bid) {
      throw new NotFoundException('Failed to execute the sale, bid not found');
    }

    const { address, treasuryMint } = auctionHouse;
    const { assetAddress, sellerAddress } = listing;

    const { collectionAddress } = await this.getBasicAssetData(assetAddress);
    const isTimedAuction = !isEmpty(listing.listingConfig);
    const { bidderAddress } = bid;

    const transaction = await getTransactionWithPriorityFee(
      createExecuteSaleTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      address,
      assetAddress,
      sellerAddress,
      bidderAddress,
      treasuryMint,
      isTimedAuction,
      collectionAddress,
    );
    return transaction;
  }

  /* Instantly buy on the listing price */
  async instantBuy(instantBuyArgs: InstantBuyArgs) {
    const { assetAddress, buyerAddress } = instantBuyArgs;

    const { auctionHouse, ...listing } = await this.prisma.listing.findUnique({
      where: {
        assetAddress_closedAt: {
          assetAddress,
          closedAt: new Date(0),
        },
      },
      include: {
        auctionHouse: true,
      },
    });

    if (!listing) {
      throw new NotFoundException(`Asset is not listed for auction`);
    }

    if (listing.source === Source.TENSOR) {
      return this.buyFromTensor(
        listing.sellerAddress,
        Number(listing.price),
        instantBuyArgs,
      );
    }

    const { address: auctionHouseAddress, treasuryMint } = auctionHouse;
    const { price, sellerAddress } = listing;

    const transaction = await getTransactionWithPriorityFee(
      createInstantBuyTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      auctionHouseAddress,
      assetAddress,
      buyerAddress,
      sellerAddress,
      treasuryMint,
      Number(price),
    );
    return transaction;
  }

  /* Buy multiples on listing price */
  async multipleBuys(instantBuyArgsArray: InstantBuyArgs[]) {
    const transactions = instantBuyArgsArray.map((instantBuyArgs) => {
      return this.instantBuy(instantBuyArgs);
    });

    return await Promise.all(transactions);
  }

  /* Buy collectible comics listed on tensor */
  async buyFromTensor(
    seller: string,
    price: number,
    instantBuyArgs: InstantBuyArgs,
  ) {
    const { assetAddress, buyerAddress } = instantBuyArgs;

    const { standard } = await this.prisma.candyMachine.findFirst({
      where: {
        collection: {
          metadatas: {
            some: {
              collectibleComics: { some: { address: assetAddress } },
            },
          },
        },
      },
    });

    if (standard === TokenStandard.Core) {
      const { data } = await fetchTensorBuyTx(
        buyerAddress,
        price,
        assetAddress,
        seller,
      );

      const bufferTx = data.tcompBuyTx.txs.at(0).tx.data;
      const buyTx = base64.deserialize(bufferTx)[0];
      return buyTx;
    }

    const latestBlockhash = await metaplex.connection.getLatestBlockhash();
    const options = {
      method: 'GET',
      url: `${TENSOR_MAINNET_API_ENDPOINT}/api/v1/tx/buy`,
      headers: {
        accept: 'application/json',
        'X-TENSOR-API-KEY': process.env.TENSOR_API_KEY ?? '',
      },
      params: {
        buyer: buyerAddress,
        mint: assetAddress,
        owner: seller,
        maxPrice: price,
        blockhash: latestBlockhash.blockhash,
      },
    };

    /*
    This is how txs struct looks like
      {
        txs: [ { tx: [Object], txV0: [Object], lastValidBlockHeight: null } ]
      }
    */

    try {
      const response = await axios.request(options);
      const { txs } = response.data;
      const buyTx = base64.deserialize(txs.at(0).tx.data)[0];

      return buyTx;
    } catch (e) {
      console.error('Error while buying', e);
      throw new HttpException(
        'Error while buying, please try again!',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
  }

  /* Cancel Buy Order */
  async cancelBid(bidId: number) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { auctionHouse: true },
    });

    if (!bid) {
      throw new NotFoundException(`Bid not found`);
    }

    if (!isEqual(bid.closedAt, new Date(0))) {
      throw new BadRequestException('Bid is already closed');
    }

    const { assetAddress, bidderAddress, auctionHouse } = bid;

    const transaction = await getTransactionWithPriorityFee(
      createCancelBidTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      auctionHouse.address,
      assetAddress,
      bidderAddress,
    );
    return transaction;
  }

  /* Cancel Sell Order */
  async cancelListing(listingId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        auctionHouse: true,
        listingConfig: true,
        digitalAsset: {
          include: {
            printEdition: true,
            collectibleComic: {
              include: {
                metadata: true,
              },
            },
            oneOfOne: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing not found`);
    }

    if (!isEqual(listing.closedAt, new Date(0))) {
      throw new BadRequestException('Listing is already closed');
    }

    const {
      sellerAddress,
      auctionHouse,
      assetAddress,
      listingConfig,
      digitalAsset,
    } = listing;
    const { printEdition, collectibleComic, oneOfOne } = digitalAsset;
    let collectionAddress: string;

    if (printEdition) collectionAddress = printEdition.collectionAddress;
    else if (collectibleComic)
      collectionAddress = collectibleComic.metadata.collectionAddress;
    else if (oneOfOne) collectionAddress = oneOfOne.collectionAddress;

    const isTimedAuction = !!listingConfig;

    const transaction = await getTransactionWithPriorityFee(
      createCancelListingTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      auctionHouse.address,
      assetAddress,
      sellerAddress,
      isTimedAuction,
      collectionAddress,
    );

    return transaction;
  }

  async repriceListing(repriceListingParams: RepriceListingParams) {
    const { listingId, price } = repriceListingParams;

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { auctionHouse: true },
    });

    if (!listing) {
      throw new NotFoundException(`Listing not found`);
    }

    if (!isEqual(listing.closedAt, new Date(0))) {
      throw new BadRequestException('Listing is already closed');
    }

    const { sellerAddress, auctionHouse, assetAddress } = listing;

    const transaction = await getTransactionWithPriorityFee(
      createRepirceListingTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      auctionHouse.address,
      assetAddress,
      sellerAddress,
      price,
    );

    return transaction;
  }

  /* Initialize Print Editions Sale */
  async initializePrintEditionSale(params: InitializePrintEditionSaleParams) {
    const { startDate, endDate, price, assetAddress, splTokenAddress } = params;

    if (endDate < startDate) {
      throw new BadRequestException(
        'End Date cannot be earlier than Start Date',
      );
    }

    const isSplTokenSupported = await this.prisma.splToken.findUnique({
      where: { address: splTokenAddress },
    });

    if (!isSplTokenSupported) {
      throw new BadRequestException('Currency not supported');
    }

    const { digitalAsset, ...printEditionCollection } =
      await this.prisma.printEditionCollection.findUnique({
        where: { address: assetAddress },
        include: { digitalAsset: true },
      });

    if (!printEditionCollection) {
      throw new BadRequestException('Print Edition Collection not found!');
    }

    if (!printEditionCollection.verifiedAt) {
      throw new UnauthorizedException(
        'Only verified print editions can put on sale',
      );
    }

    const transaction = await getTransactionWithPriorityFee(
      createInitEditionSaleTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      digitalAsset.ownerAddress,
      printEditionCollection.address,
      splTokenAddress,
      price,
      startDate,
      endDate,
    );
    return transaction;
  }

  /* Buy print editions from primary sale */
  async buyPrintEdition(params: BuyPrintEditionParams) {
    const address = params.assetAddress;
    const { printEditionSaleConfig, digitalAsset, ...printEditionCollection } =
      await this.prisma.printEditionCollection.findUnique({
        where: { address },
        include: { printEditionSaleConfig: true, digitalAsset: true },
      });

    if (!printEditionSaleConfig) {
      throw new BadRequestException('Edition is not on sale');
    }

    assertPrintEditionSaleConfig(printEditionSaleConfig);

    const transaction = await getTransactionWithPriorityFee(
      createBuyPrintEditionTransaction,
      MIN_COMPUTE_PRICE,
      this.umi,
      printEditionCollection.address,
      digitalAsset.ownerAddress,
      params.buyerAddress,
      printEditionSaleConfig.currencyMint,
    );
    return transaction;
  }

  async getComicIssueTotalVolume(comicIssueId: number) {
    const getSecondaryVolume = this.prisma.auctionSale.aggregate({
      where: {
        listing: {
          digitalAsset: {
            collectibleComic: { metadata: { collection: { comicIssueId } } },
          },
        },
      },
      _sum: { price: true },
    });

    const getPrimaryVolume = this.prisma.candyMachineReceipt.aggregate({
      where: {
        collectibleComics: {
          every: { metadata: { collection: { comicIssueId } } },
        },
      },
      _sum: { price: true },
    });

    const [primarySalesVolume, secondarySalesVolume] = await Promise.all([
      getSecondaryVolume,
      getPrimaryVolume,
    ]);

    const primaryVolume = primarySalesVolume._sum?.price || 0;
    const secondaryVolume = secondarySalesVolume._sum?.price || 0;
    const totalVolume = Number(primaryVolume) + Number(secondaryVolume);
    return totalVolume;
  }

  async findCollectionStats(
    comicIssueId: number,
  ): Promise<CollectonMarketplaceStats> {
    const getTotalVolume = this.getComicIssueTotalVolume(comicIssueId);

    const countListed = this.prisma.listing.count({
      where: {
        digitalAsset: {
          collectibleComic: { metadata: { collection: { comicIssueId } } },
        },
        closedAt: new Date(0),
      },
    });

    const getCheapestItem = this.prisma.listing.findFirst({
      where: {
        digitalAsset: {
          collectibleComic: { metadata: { collection: { comicIssueId } } },
        },
        closedAt: new Date(0),
      },
      orderBy: { price: 'asc' },
      select: { price: true },
    });

    const getSupply = this.prisma.candyMachine.aggregate({
      where: { collection: { comicIssueId } },
      _sum: { supply: true },
    });

    const [totalVolume, itemsListed, cheapestItem, candyMachineSupply] =
      await Promise.all([
        getTotalVolume,
        countListed,
        getCheapestItem,
        getSupply,
      ]);
    return {
      totalVolume,
      itemsListed: itemsListed || 0,
      floorPrice: cheapestItem?.price ? Number(cheapestItem.price) : 0,
      supply: candyMachineSupply?._sum.supply || 0,
    };
  }

  async findListedItems(listingFilterParams: ListingFilterParams) {
    const sortTag = listingFilterParams.sortTag ?? ListingSortTag.Price;
    const sortOrder = listingFilterParams.sortOrder ?? SortOrder.ASC;

    const { comicIssueId, rarity, isSigned, isUsed, take, skip } =
      listingFilterParams;

    let listings = await this.prisma.listing.findMany({
      where: {
        closedAt: new Date(0),
        sale: isBoolean(listingFilterParams.isSold)
          ? { [listingFilterParams.isSold ? 'not' : 'equals']: null }
          : undefined,
        digitalAsset: {
          collectibleComic: {
            metadata: {
              collection: { comicIssueId },
              rarity,
              isUsed,
              isSigned,
            },
          },
        },
        source: { in: [Source.METAPLEX, Source.TENSOR] },
      },
      orderBy: {
        price: sortTag == ListingSortTag.Price ? sortOrder : SortOrder.ASC,
      },
      include: {
        digitalAsset: {
          include: {
            owner: { include: { user: true } },
            collectibleComic: { include: { metadata: true } },
          },
        },
      },
      take,
      skip,
    });

    if (sortTag == ListingSortTag.Rarity) {
      listings = sortBy(listings, (item) => {
        const rarityIndex = RARITY_PRECEDENCE.indexOf(
          item.digitalAsset.collectibleComic.metadata.rarity,
        );
        return sortOrder == SortOrder.DESC ? -rarityIndex : rarityIndex;
      });
    }
    return listings;
  }

  async syncTensorListings(listings: TENSOR_LISTING_RESPONSE[]) {
    for await (const listing of listings) {
      const isTensor =
        listing.tx.source === 'TENSORSWAP' || listing.tx.source === 'TCOMP';
      if (!isTensor) {
        console.log(
          `Listing for ${listing.mint} is not fron ${ProgramSource.T_COMP} or ${ProgramSource.T_SWAP}`,
        );
        continue;
      }

      const collectibleComic = await this.prisma.collectibleComic.findUnique({
        where: { address: listing.mint.onchainId },
      });

      const source =
        listing.tx.source === 'TENSORSWAP'
          ? ProgramSource.T_SWAP
          : ProgramSource.T_COMP;
      const auctionHouseAddress =
        listing.tx.source === 'TENSORSWAP'
          ? TSWAP_PROGRAM_ID
          : TCOMP_PROGRAM_ID;

      await this.prisma.listing.upsert({
        where: {
          assetAddress_closedAt: {
            assetAddress: listing.mint.onchainId,
            closedAt: new Date(0),
          },
        },
        update: {
          price: +listing.tx.grossAmount,
          sellerAddress: listing.tx.sellerId,
          createdAt: new Date(),
          signature: listing.tx.txId,
          source,
        },
        create: {
          auctionHouse: {
            // TODO: Check if you need actual auction house address for creating the buy order ?
            connect: { address: auctionHouseAddress },
          },
          price: +listing.tx.grossAmount,
          sellerAddress: listing.tx.sellerId,
          createdAt: new Date(),
          signature: listing.tx.txId,
          source,
          closedAt: new Date(0),
          digitalAsset: {
            connect: { address: collectibleComic.address },
          },
        },
      });
    }

    // NOTE: Uncomment and use as per required.
    // const allListings = await this.prisma.collectibleComic.findMany({
    //   where: {
    //     digitalAsset: {listings: { some: { closedAt: new Date(0), source: Source.TENSOR || Source.MAGIC_EDEN } }},
    //     metadata: { collectionAddress: '<COLLECTION_ADDRESS>'},
    //   },
    // });

    // for await (const listing of allListings) {
    //   const doesExist = listings.find(
    //     (item) => item.mint.onchainId === listing.address,
    //   );
    //   if (!doesExist) {
    //     await this.prisma.listing.update({
    //       where: {
    //         assetAddress_closedAt: {
    //           assetAddress: listing.address,
    //           closedAt: new Date(0),
    //         },
    //       },
    //       data: {
    //         closedAt: new Date(),
    //       },
    //     });
    //   }
    // }
  }

  async validateMint(nftAddress: string) {
    const candyMachines = await this.prisma.candyMachine.findMany();
    const dasAsset = await getAsset(nftAddress);
    const ourCandyMachine = findOurCandyMachine(
      this.metaplex,
      candyMachines,
      dasAsset.creators,
    );

    if (!ourCandyMachine) {
      throw new BadRequestException(
        `NFT ${nftAddress} is not from a verified collection`,
      );
    }
    const updateAuthority = dasAsset.authorities.find((authority) =>
      authority.scopes.find((scope) => scope == Scope.METADATA),
    );
    if (
      !LOCKED_COLLECTIONS.has(nftAddress) &&
      this.metaplex.identity().publicKey.toString() === updateAuthority?.address
    ) {
      await this.heliusService.reIndexAsset(dasAsset, ourCandyMachine);
    }
  }
}
