import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { Listing, Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  constructCancelBidTransaction,
  constructCancelListingTransaction,
  constructInstantBuyTransaction,
  constructListTransaction,
  constructPrivateBidTransaction,
  toListing,
} from './instructions';
import { PrismaService } from 'nestjs-prisma';
import { CollectonMarketplaceStats } from './dto/types/collection-marketplace-stats';
import {
  ListingFilterParams,
  ListingSortTag,
} from './dto/listing-fliter-params.dto';
import { isBoolean, sortBy, throttle } from 'lodash';
import { BuyArgs } from './dto/types/buy-args';
import { metaplex } from '../utils/metaplex';
import { PartialListing } from './dto/types/partial-listing';
import { Scope, Source } from 'helius-sdk';
import { SortOrder } from '../types/sort-order';
import {
  D_PUBLISHER_SYMBOL,
  LOCKED_COLLECTIONS,
  RARITY_PRECEDENCE,
  TENSOR_MAINNET_API_ENDPOINT,
} from '../constants';
import { TENSOR_LISTING_RESPONSE } from './dto/types/tensor-listing-response';
import axios from 'axios';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { AssetType, TokenStandard } from '@prisma/client';
import { fetchTensorBuyTx, findOurCandyMachine, getAsset } from '../utils/das';
import { HeliusService } from '../webhooks/helius/helius.service';

@Injectable()
export class AuctionHouseService {
  private readonly metaplex: Metaplex;
  private readonly auctionHouseAddress: PublicKey;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {
    this.metaplex = metaplex;
    this.auctionHouseAddress = new PublicKey(process.env.AUCTION_HOUSE_ADDRESS);
  }

  async findOurAuctionHouse() {
    return this.metaplex
      .auctionHouse()
      .findByAddress({ address: this.auctionHouseAddress });
  }

  private throttledFindOurAuctionHouse = throttle(
    this.findOurAuctionHouse,
    24 * 60 * 60 * 1000, // 24 hours
  );

  // Execute Sale for a nft listed and agreed on the bid by seller
  async constructExecutelistedSale(
    payer: PublicKey,
    listReceipt: PublicKey,
    bidReceipt: PublicKey,
    printReceipt: boolean,
  ) {
    const auctionHouse = await this.throttledFindOurAuctionHouse();
    const listing = await this.metaplex
      .auctionHouse()
      .findListingByReceipt({ receiptAddress: listReceipt, auctionHouse });

    const bid = await this.metaplex
      .auctionHouse()
      .findBidByReceipt({ receiptAddress: bidReceipt, auctionHouse });

    const executeSaleTransactionBuilder = this.metaplex
      .auctionHouse()
      .builders()
      .executeSale(
        {
          auctionHouse,
          listing,
          bid,
          printReceipt,
        },
        { payer: this.metaplex.identity() },
      );
    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash();

    const executeSaleTransaction =
      executeSaleTransactionBuilder.toTransaction(latestBlockhash);

    executeSaleTransaction.feePayer = payer;

    if (printReceipt) executeSaleTransaction.sign(this.metaplex.identity());

    const rawTransaction = executeSaleTransaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return rawTransaction.toString('base64');
  }

  async createMultipleBuys(buyArguments: BuyArgs[]) {
    const transactions = buyArguments.map((buyArg) => {
      return this.createInstantBuyTransaction(buyArg);
    });
    return await Promise.all(transactions);
  }

  async createBuyFromTensor(
    seller: string,
    price: number,
    buyArguments: BuyArgs,
  ) {
    const { mintAccount, buyer } = buyArguments;
    const { standard } = await this.prisma.candyMachine.findFirst({
      where: {
        collection: {
          metadatas: {
            some: { asset: { some: { address: mintAccount.toString() } } },
          },
        },
      },
    });
    if (standard === TokenStandard.Core) {
      const { data } = await fetchTensorBuyTx(
        buyer.toString(),
        price,
        mintAccount.toString(),
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
        buyer: buyer.toString(),
        mint: mintAccount.toString(),
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

  async createInstantBuyTransaction(buyArguments: BuyArgs) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        assetAddress_canceledAt: {
          assetAddress: buyArguments.mintAccount.toString(),
          canceledAt: new Date(0),
        },
      },
      include: { asset: true },
    });
    if (!listing) {
      throw new NotFoundException(
        `Cannot find listing with address ${buyArguments.mintAccount.toString()}`,
      );
    }

    if (listing.source === Source.TENSOR) {
      return await this.createBuyFromTensor(
        listing.feePayer,
        Number(listing.price),
        buyArguments,
      );
    }

    const auctionHouse = await this.throttledFindOurAuctionHouse();
    return await constructInstantBuyTransaction(
      this.metaplex,
      auctionHouse,
      buyArguments,
      listing,
    );
  }

  async createListOnTensorTransaction(
    seller: PublicKey,
    mintAccount: PublicKey,
    price: number,
  ) {
    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash(
      'confirmed',
    );
    const options = {
      method: 'GET',
      url: `${TENSOR_MAINNET_API_ENDPOINT}/api/v1/tx/list`,
      headers: {
        accept: 'application/json',
        'X-TENSOR-API-KEY': process.env.TENSOR_API_KEY ?? '',
      },
      params: {
        mint: mintAccount.toString(),
        owner: seller.toString(),
        price,
        blockhash: latestBlockhash.blockhash,
      },
    };
    try {
      const response = await axios.request(options);
      const { txs } = response.data;
      const listTx = base64.deserialize(txs.at(0).tx.data)[0];

      return listTx;
    } catch (e) {
      console.error('Error while listing', e);
      throw new HttpException(
        'Error while listing, please try again!',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
  }

  /* currently only list NFTs */
  async createListTransaction(
    seller: PublicKey,
    mintAccount: PublicKey,
    price: number,
    printReceipt: boolean,
  ) {
    const candyMachine = await this.prisma.candyMachine.findFirst({
      where: {
        collection: {
          metadatas: {
            some: { asset: { some: { address: mintAccount.toString() } } },
          },
        },
      },
    });

    if (!candyMachine) {
      throw new NotFoundException('Invalid Asset');
    }

    if (candyMachine.standard === TokenStandard.Core) {
      return await this.createListOnTensorTransaction(
        seller,
        mintAccount,
        price,
      );
    }
    const auctionHouse = await this.throttledFindOurAuctionHouse();
    await this.validateMint(mintAccount.toString());
    return await constructListTransaction(
      this.metaplex,
      auctionHouse,
      seller,
      mintAccount,
      price,
      printReceipt,
    );
  }

  async createPrivateBidTransaction(
    buyer: PublicKey,
    mintAccount: PublicKey,
    price: number,
    printReceipt: boolean,
    seller?: PublicKey,
    tokenAccount?: PublicKey,
  ) {
    if (!seller && !tokenAccount) {
      throw new BadRequestException(
        'Seller or associated token account must be provided!',
      );
    }
    const auctionHouse = await this.throttledFindOurAuctionHouse();

    return await constructPrivateBidTransaction(
      this.metaplex,
      auctionHouse,
      buyer,
      mintAccount,
      price,
      printReceipt,
      seller,
    );
  }

  async createCancelBidTransaction(receiptAddress: PublicKey) {
    const auctionHouse = await this.throttledFindOurAuctionHouse();
    const bid = await this.metaplex
      .auctionHouse()
      .findBidByReceipt({ receiptAddress, auctionHouse });

    return await constructCancelBidTransaction(
      this.metaplex,
      auctionHouse,
      bid,
    );
  }

  async createCancelListingTransaction(
    receiptAddress?: PublicKey,
    assetAddress?: string,
  ) {
    const auctionHouse = await this.throttledFindOurAuctionHouse();

    let partialListing: Listing | PartialListing;
    if (receiptAddress) {
      partialListing = await this.metaplex
        .auctionHouse()
        .findListingByReceipt({ receiptAddress, auctionHouse });
    } else {
      const listing = await this.prisma.listing.findFirst({
        where: { assetAddress, canceledAt: new Date(0) },
        include: { asset: true },
      });
      partialListing = await toListing(this.metaplex, auctionHouse, listing);
    }

    return await constructCancelListingTransaction(
      this.metaplex,
      auctionHouse,
      partialListing,
    );
  }

  async getTotalVolume(comicIssueId: number) {
    const getSecondaryVolume = this.prisma.listing.aggregate({
      where: {
        asset: { metadata: { collection: { comicIssueId } } },
        soldAt: { not: null },
      },
      _sum: { price: true },
    });

    const getPrimaryVolume = this.prisma.candyMachineReceipt.aggregate({
      where: { asset: { metadata: { collection: { comicIssueId } } } },
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
    const getTotalVolume = this.getTotalVolume(comicIssueId);

    const countListed = this.prisma.listing.count({
      where: {
        asset: { metadata: { collection: { comicIssueId } } },
        canceledAt: new Date(0),
      },
    });

    const getCheapestItem = this.prisma.listing.findFirst({
      where: {
        asset: { metadata: { collection: { comicIssueId } } },
        canceledAt: new Date(0),
      },
      orderBy: { price: 'asc' },
      select: { price: true },
    });

    const getSupply = this.prisma.candyMachine.findFirst({
      where: { collection: { comicIssueId } },
      select: { supply: true },
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
      supply: candyMachineSupply?.supply || 0,
    };
  }

  async findListedItems(query: ListingFilterParams) {
    const sortTag = query.sortTag ?? ListingSortTag.Price;
    const sortOrder = query.sortOrder ?? SortOrder.ASC;

    let listings = await this.prisma.listing.findMany({
      where: {
        canceledAt: new Date(0),
        soldAt: isBoolean(query.isSold)
          ? { [query.isSold ? 'not' : 'equals']: null }
          : undefined,
        asset: {
          metadata: {
            collection: { comicIssueId: query.comicIssueId },
            rarity: query.rarity,
            isUsed: query.isUsed,
            isSigned: query.isSigned,
          },
        },
        source: { in: [Source.METAPLEX, Source.TENSOR] },
      },
      orderBy: {
        price: sortTag == ListingSortTag.Price ? sortOrder : SortOrder.ASC,
      },
      include: {
        asset: {
          include: { owner: { include: { user: true } }, metadata: true },
        },
      },
      take: query.take,
      skip: query.skip,
    });

    if (sortTag == ListingSortTag.Rarity) {
      listings = sortBy(listings, (item) => {
        const rarityIndex = RARITY_PRECEDENCE.indexOf(
          item.asset.metadata.rarity,
        );
        return sortOrder == SortOrder.DESC ? -rarityIndex : rarityIndex;
      });
    }
    return listings;
  }

  async syncListings(listings: TENSOR_LISTING_RESPONSE[]) {
    for await (const listing of listings) {
      await this.prisma.listing.upsert({
        where: {
          assetAddress_canceledAt: {
            assetAddress: listing.mint.onchainId,
            canceledAt: new Date(0),
          },
        },
        update: {
          price: +listing.tx.grossAmount,
          feePayer: listing.tx.sellerId,
          createdAt: new Date(),
          signature: listing.tx.txId,
          source:
            listing.tx.source === 'TENSORSWAP' || listing.tx.source === 'TCOMP'
              ? Source.TENSOR
              : Source.MAGIC_EDEN,
        },
        create: {
          assetAddress: listing.mint.onchainId,
          symbol: D_PUBLISHER_SYMBOL,
          price: +listing.tx.grossAmount,
          feePayer: listing.tx.sellerId,
          createdAt: new Date(),
          signature: listing.tx.txId,
          // TODO: Change this to be used from transaction details
          splToken: WRAPPED_SOL_MINT.toString(),
          // TODO: Change this to be used from transaction details
          type: AssetType.CollectibleComic,
          source:
            listing.tx.source === 'TENSORSWAP' || listing.tx.source === 'TCOMP'
              ? Source.TENSOR
              : Source.MAGIC_EDEN,
          canceledAt: new Date(0),
        },
      });
    }

    // NOTE: Uncomment and use as per required.
    // const allListings = await this.prisma.nft.findMany({
    //   where: {
    //     listing: { some: { canceledAt: new Date(0), source: Source.TENSOR || Source.MAGIC_EDEN } },
    //     collectionNftAddress: '<COLLECTION_ADDRESS>',
    //   },
    // });
    // let count = 0;
    // for await (const listing of allListings) {
    //   const doesExist = listings.find(
    //     (item) => item.mint.onchainId === listing.address,
    //   );
    //   if (!doesExist) {
    //     await this.prisma.listing.update({
    //       where: {
    //         nftAddress_canceledAt: {
    //           nftAddress: listing.address,
    //           canceledAt: new Date(0),
    //         },
    //       },
    //       data: {
    //         canceledAt: new Date(),
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
