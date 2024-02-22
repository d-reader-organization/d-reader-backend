import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  Listing,
  Metaplex,
  toBigNumber,
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
import {
  ListingFilterParams,
  ListingSortTag,
} from './dto/listing-fliter-params.dto';
import { isBoolean, sortBy, throttle } from 'lodash';
import { BuyArgs } from './dto/types/buy-args';
import { metaplex } from '../utils/metaplex';
import { AUTH_TAG, pda } from '../candy-machine/instructions/pda';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';
import { PartialListing } from './dto/types/partial-listing';
import { Source } from 'helius-sdk';
import { TensorSwapSDK } from '@tensor-oss/tensorswap-sdk';
import { AnchorProvider } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SortOrder } from '../types/sort-order';
import { RARITY_PRECEDENCE } from '../constants';

@Injectable()
export class AuctionHouseService {
  private readonly metaplex: Metaplex;
  private readonly auctionHouseAddress: PublicKey;
  private readonly tensorSwap: TensorSwapSDK;

  constructor(private readonly prisma: PrismaService) {
    this.metaplex = metaplex;
    this.auctionHouseAddress = new PublicKey(process.env.AUCTION_HOUSE_ADDRESS);
    const provider = new AnchorProvider(
      this.metaplex.connection,
      this.metaplex.identity(),
      { commitment: 'confirmed' },
    );
    this.tensorSwap = new TensorSwapSDK({ provider });
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

  async createBuyFromTensor(buyArguments: BuyArgs) {
    const { mintAccount, buyer, seller, price } = buyArguments;
    const nftBuyerAcc = this.metaplex
      .tokens()
      .pdas()
      .associatedTokenAccount({ mint: mintAccount, owner: buyer });

    const {
      tx: { ixs },
    } = await this.tensorSwap.buySingleListing({
      nftMint: mintAccount,
      nftBuyerAcc,
      owner: seller,
      buyer,
      maxPrice: toBigNumber(price),
      tokenProgram: TOKEN_PROGRAM_ID,
    });

    const latestBlockhash = await metaplex.connection.getLatestBlockhash();
    const buyTx = new Transaction({ feePayer: buyer, ...latestBlockhash }).add(
      ...ixs,
    );

    const rawTransaction = buyTx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return rawTransaction.toString('base64');
  }

  async createInstantBuyTransaction(buyArguments: BuyArgs) {
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

    if (listing.source === Source.TENSOR) {
      return await this.createBuyFromTensor(buyArguments);
    }

    const auctionHouse = await this.throttledFindOurAuctionHouse();
    return await constructInstantBuyTransaction(
      this.metaplex,
      auctionHouse,
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
    const getSecondaryVolume = this.prisma.listing.aggregate({
      where: {
        nft: { collectionNft: { comicIssueId } },
        soldAt: { not: null },
      },
      _sum: { price: true },
    });

    const getPrimaryVolume = this.prisma.candyMachineReceipt.aggregate({
      where: { nft: { collectionNft: { comicIssueId } } },
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

    const getSupply = this.prisma.candyMachine.findFirst({
      where: { collectionNft: { comicIssueId } },
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
        nft: {
          collectionNft: { comicIssueId: query.comicIssueId },
          metadata: {
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
        nft: {
          include: { owner: { include: { user: true } }, metadata: true },
        },
      },
      take: query.take,
      skip: query.skip,
    });

    if (sortTag == ListingSortTag.Rarity) {
      listings = sortBy(listings, (item) => {
        const rarityIndex = RARITY_PRECEDENCE.indexOf(item.nft.metadata.rarity);
        return sortOrder == SortOrder.DESC ? -rarityIndex : rarityIndex;
      });
    }
    return listings;
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
    const candyMachine = new PublicKey(nft.candyMachineAddress);
    const collectionAddress = new PublicKey(nft.collectionNftAddress);
    const updateAuthorityAddress = pda(
      [
        Buffer.from(AUTH_TAG + nft.metadata.rarity.toLowerCase()),
        candyMachine.toBuffer(),
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
