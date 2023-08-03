import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import {
  Listing,
  Metaplex,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
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
import { FilterParams } from './dto/listing-fliter-params.dto';
import { isBoolean, throttle } from 'lodash';
import { BuyArgs } from './dto/types/buy-args';
import { metaplex } from '../utils/metaplex';
import { AUTH_TAG, pda } from '../candy-machine/instructions/pda';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';
import { PartialListing } from './dto/types/partial-listing';

@Injectable()
export class AuctionHouseService {
  private readonly metaplex: Metaplex;
  private readonly auctionHouseAddress: PublicKey;

  constructor(private readonly prisma: PrismaService) {
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

  async createMultipleBuys(buyer: PublicKey, buyArguments: BuyArgs[]) {
    const transactions = buyArguments.map((args) =>
      this.createInstantBuyTransaction(buyer, args),
    );
    return await Promise.all(transactions);
  }

  async createInstantBuyTransaction(buyer: PublicKey, buyArguments: BuyArgs) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        nftAddress_canceledAt: {
          nftAddress: buyArguments.mintAccount.toString(),
          canceledAt: new Date(0),
        },
      },
      include: { nft: true },
    });
    if (!listing) {
      throw new NotFoundException(
        `Cannot find listing with address ${buyArguments.mintAccount.toString()}`,
      );
    }

    const auctionHouse = await this.throttledFindOurAuctionHouse();

    return await constructInstantBuyTransaction(
      this.metaplex,
      auctionHouse,
      buyer,
      buyArguments,
      listing,
    );
  }

  /* currently only list NFTs */
  async createListTransaction(
    seller: PublicKey,
    mintAccount: PublicKey,
    price: number,
    printReceipt: boolean,
  ) {
    const auctionHouse = await this.throttledFindOurAuctionHouse();
    await this.validateMint(mintAccount);

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
    nftAddress?: string,
  ) {
    const auctionHouse = await this.throttledFindOurAuctionHouse();

    let partialListing: Listing | PartialListing;
    if (receiptAddress) {
      partialListing = await this.metaplex
        .auctionHouse()
        .findListingByReceipt({ receiptAddress, auctionHouse });
    } else {
      const listing = await this.prisma.listing.findFirst({
        where: { nftAddress, canceledAt: new Date(0) },
        include: { nft: true },
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
    const sellAggregate = this.prisma.listing.aggregate({
      where: {
        nft: { collectionNft: { comicIssueId } },
        soldAt: { not: null },
      },
      _sum: { price: true },
    });

    const mintAggregate = this.prisma.candyMachineReceipt.aggregate({
      where: {
        nft: { collectionNft: { comicIssueId } },
      },
      _sum: { price: true },
    });

    const [sellVolume, mintVolume] = await Promise.all([
      sellAggregate,
      mintAggregate,
    ]);
    return (sellVolume._sum?.price || 0) + (mintVolume._sum?.price || 0);
  }

  async findCollectionStats(
    comicIssueId: number,
  ): Promise<CollectonMarketplaceStats> {
    const aggregate = this.getTotalVolume(comicIssueId);

    const countListed = this.prisma.listing.count({
      where: {
        nft: { collectionNft: { comicIssueId } },
        canceledAt: new Date(0),
      },
    });

    const getCheapestItem = this.prisma.listing.findFirst({
      where: {
        nft: { collectionNft: { comicIssueId } },
        canceledAt: new Date(0),
      },
      orderBy: { price: 'asc' },
      select: { price: true },
    });

    const [aggregations, itemsListed, cheapestItem] = await Promise.all([
      aggregate,
      countListed,
      getCheapestItem,
    ]);
    return {
      totalVolume: aggregations,
      itemsListed: itemsListed || 0,
      floorPrice: cheapestItem?.price || 0,
    };
  }

  async findAllListings(query: FilterParams, comicIssueId: number) {
    return await this.prisma.listing.findMany({
      where: {
        canceledAt: new Date(0),
        soldAt: isBoolean(query.isSold)
          ? {
              [query.isSold ? 'not' : 'equals']: null,
            }
          : undefined,
        nft: {
          collectionNft: { comicIssueId },
        },
      },
      include: { nft: { include: { owner: { include: { user: true } } } } },
      take: query.take,
      skip: query.skip,
    });
  }

  async validateMint(nftAddress: PublicKey) {
    const metadataPda = this.metaplex
      .nfts()
      .pdas()
      .metadata({ mint: nftAddress });
    const info = await this.metaplex.rpc().getAccount(metadataPda);
    if (!info) {
      throw new BadRequestException(
        `NFT ${nftAddress} doesn't have any metadata`,
      );
    }

    const metadata = toMetadata(toMetadataAccount(info));
    const nft = await this.prisma.nft.findFirst({
      where: { address: metadata.mintAddress.toString() },
      include: { metadata: true },
    });
    const collectionAddress = new PublicKey(nft.collectionNftAddress);
    const updateAuthorityAddress = await pda(
      [
        Buffer.from(AUTH_TAG + nft.metadata.rarity.toLowerCase()),
        collectionAddress.toBuffer(),
      ],
      COMIC_VERSE_ID,
    );

    if (
      !metadata.collection.verified ||
      !updateAuthorityAddress.equals(metadata.updateAuthorityAddress)
    ) {
      throw new BadRequestException(
        `NFT ${nftAddress} is not from a verified collection`,
      );
    }
  }
}
