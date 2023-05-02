import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  AuctionHouse,
  Metaplex,
  token,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
import {
  constructCancelBidInstruction,
  constructCancelListingInstruction,
  constructListInstruction,
  constructPrivateBidInstruction,
} from './instructions';
import { PrismaService } from 'nestjs-prisma';
import { CollectonMarketplaceStats } from './dto/types/collection-marketplace-stats';
import { ListingFilterParams } from './dto/listing-fliter-params.dto';
import { constructExecuteSaleInstruction } from './instructions/executeSale';
import { Listing, Nft } from '@prisma/client';
import { isBoolean } from 'lodash';
import { ListingModel } from './dto/types/listing-model';
import { BidModel } from './dto/types/bid-model';
import { BuyArgs } from './dto/types/buy-args';
import { solFromLamports } from '../utils/helpers';
import { initMetaplex } from '../utils/metaplex';

@Injectable()
export class AuctionHouseService {
  private readonly metaplex: Metaplex;
  private readonly auctionHouseAddress: PublicKey;

  constructor(private readonly prisma: PrismaService) {
    this.metaplex = initMetaplex();
    this.auctionHouseAddress = new PublicKey(process.env.AUCTION_HOUSE_ADDRESS);
  }

  async findOurAuctionHouse() {
    return this.metaplex
      .auctionHouse()
      .findByAddress({ address: this.auctionHouseAddress });
  }

  // Execute Sale for a nft listed and agreed on the bid by seller
  async constructExecutelistedSale(
    payer: PublicKey,
    listReceipt: PublicKey,
    bidReceipt: PublicKey,
    printReceipt: boolean,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
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
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();

      const executeSaleTransaction =
        executeSaleTransactionBuilder.toTransaction(latestBlockhash);

      executeSaleTransaction.feePayer = payer;

      if (printReceipt) executeSaleTransaction.sign(this.metaplex.identity());

      const rawTransaction = executeSaleTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return rawTransaction.toString('base64');
    } catch (e) {
      console.log('Error while executing sale ', e);
    }
  }

  async constructMultipleBuys(
    buyer: PublicKey,
    buyArgs: BuyArgs[],
  ): Promise<string[]> {
    try {
      const transactions = buyArgs.map((args) => {
        return this.constructInstantBuyTransaction(buyer, args);
      });
      return await Promise.all(transactions);
    } catch (e) {
      console.log(e);
    }
  }

  async constructInstantBuyTransaction(buyer: PublicKey, buyArgs: BuyArgs) {
    try {
      const { mintAccount, seller, price } = buyArgs;
      const listingModel = await this.prisma.listing.findUnique({
        where: {
          nftAddress_canceledAt: {
            nftAddress: mintAccount.toString(),
            canceledAt: new Date(0),
          },
        },
        include: { nft: true },
      });
      if (!listingModel) {
        throw new NotFoundException(
          `Cannot find listing with address ${mintAccount.toString()}`,
        );
      }

      const auctionHouse = await this.findOurAuctionHouse();
      const bidInstruction = await constructPrivateBidInstruction(
        this.metaplex,
        auctionHouse,
        buyer,
        mintAccount,
        solFromLamports(price),
        token(1),
        false,
        seller,
      );
      const listing = await this.toListing(auctionHouse, listingModel);
      const bid = this.toBid(
        auctionHouse,
        buyer,
        mintAccount,
        price,
        listingModel.symbol,
        seller,
      );
      const executeSaleInstruction = constructExecuteSaleInstruction(
        this.metaplex,
        auctionHouse,
        listing,
        bid,
      );
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();

      const instantBuyTransaction = new Transaction({
        feePayer: buyer,
        ...latestBlockhash,
      })
        .add(...bidInstruction)
        .add(executeSaleInstruction);

      const rawTransaction = instantBuyTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return rawTransaction.toString('base64');
    } catch (error) {
      console.log('Error while executing sale', error);
    }
  }

  /* currently only list NFTs */
  async constructListTransaction(
    seller: PublicKey,
    mintAccount: PublicKey,
    price: number,
    printReceipt: boolean,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
      await this.validateMint(mintAccount);
      const listInstruction = constructListInstruction(
        this.metaplex,
        auctionHouse,
        mintAccount,
        seller,
        solFromLamports(price),
        printReceipt,
        token(1, 0),
      );

      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();
      const listTransaction = new Transaction({
        feePayer: seller,
        ...latestBlockhash,
      }).add(...listInstruction);

      const rawTransaction = listTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return rawTransaction.toString('base64');
    } catch (e) {
      console.log('Error while creating listing transaction ', e);
    }
  }

  async constructPrivateBidTransaction(
    buyer: PublicKey,
    mintAccount: PublicKey,
    price: number,
    printReceipt: boolean,
    seller?: PublicKey,
    tokenAccount?: PublicKey,
  ) {
    try {
      if (!seller && !tokenAccount) {
        throw new BadRequestException(
          'Seller or associated token account must be provided!',
        );
      }
      const auctionHouse = await this.findOurAuctionHouse();
      const bidInstruction = await constructPrivateBidInstruction(
        this.metaplex,
        auctionHouse,
        buyer,
        mintAccount,
        solFromLamports(price),
        token(1),
        printReceipt,
        seller,
      );
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();
      const bidTransaction = new Transaction({
        feePayer: buyer,
        ...latestBlockhash,
      }).add(...bidInstruction);

      const rawTransaction = bidTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return rawTransaction.toString('base64');
    } catch (e) {
      console.log('Error while constructing private bid transaction ', e);
    }
  }

  async constructCancelBidTransaction(receiptAddress: PublicKey) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();

      const bid = await this.metaplex
        .auctionHouse()
        .findBidByReceipt({ receiptAddress, auctionHouse });

      const cancelBidInstruction = constructCancelBidInstruction(
        this.metaplex,
        bid,
        auctionHouse,
      );
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();
      const bidTransaction = new Transaction({
        feePayer: bid.buyerAddress,
        ...latestBlockhash,
      }).add(...cancelBidInstruction);

      const rawTransaction = bidTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return rawTransaction.toString('base64');
    } catch (e) {
      console.log('Error while constructing cancel bid transaction ', e);
    }
  }

  async constructCancelListingTransaction(
    receiptAddress?: PublicKey,
    mint?: string,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();

      let listing: any;
      if (receiptAddress) {
        listing = await this.metaplex
          .auctionHouse()
          .findListingByReceipt({ receiptAddress, auctionHouse });
      } else {
        const listingModel = await this.prisma.listing.findFirst({
          where: {
            nftAddress: mint,
            canceledAt: new Date(0),
          },
          include: { nft: true },
        });
        listing = await this.toListing(auctionHouse, listingModel);
      }

      const cancelListingTransaction = constructCancelListingInstruction(
        listing,
        auctionHouse,
      );
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();
      const listingTransaction = new Transaction({
        feePayer: listing.sellerAddress,
        ...latestBlockhash,
      }).add(...cancelListingTransaction);

      const rawTransaction = listingTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return rawTransaction.toString('base64');
    } catch (e) {
      console.log('Error while constructing cancel listing transaction ', e);
    }
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
    try {
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
    } catch (e) {
      console.log(e);
    }
  }

  async findAllListings(query: ListingFilterParams, comicIssueId: number) {
    return await this.prisma.listing.findMany({
      where: {
        canceledAt: new Date(0),
        soldAt: isBoolean(query.isSold)
          ? {
              [query.isSold ? 'not' : 'equals']: null,
            }
          : undefined,
        nft: {
          collectionNft: {
            comicIssueId,
          },
        },
      },
      include: { nft: { include: { owner: true } } },
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
    if (
      !metadata.collection.verified ||
      !this.metaplex.identity().equals(metadata.updateAuthorityAddress)
    ) {
      throw new BadRequestException(
        `NFT ${nftAddress} is not from a verified collection`,
      );
    }
  }

  async toListing(
    auctionHouse: AuctionHouse,
    listingModel: Listing & {
      nft: Nft;
    },
  ): Promise<ListingModel> {
    const address = new PublicKey(listingModel.nftAddress);
    const sellerAddress = new PublicKey(listingModel.nft.ownerAddress);
    const tokenAccount = this.metaplex.tokens().pdas().associatedTokenAccount({
      mint: address,
      owner: sellerAddress,
    });

    const price = solFromLamports(listingModel.price);
    const tokens = token(1, 0, listingModel.symbol); // only considers nfts
    const tradeStateAddress = this.metaplex.auctionHouse().pdas().tradeState({
      auctionHouse: auctionHouse.address,
      wallet: sellerAddress,
      treasuryMint: auctionHouse.treasuryMint.address,
      tokenMint: address,
      price: price.basisPoints,
      tokenSize: tokens.basisPoints,
      tokenAccount,
    });

    const metadataAddress = this.metaplex
      .nfts()
      .pdas()
      .metadata({ mint: address });
    const info = await this.metaplex.rpc().getAccount(metadataAddress);
    const metadata = toMetadata(toMetadataAccount(info));

    return {
      asset: {
        token: { address: tokenAccount },
        address,
        creators: metadata.creators,
        metadataAddress,
      },
      sellerAddress,
      tradeStateAddress,
      price,
      tokens,
      auctionHouse,
    };
  }

  toBid(
    auctionHouse: AuctionHouse,
    buyerAddress: PublicKey,
    address: PublicKey,
    amount: number,
    symbol: string,
    seller: PublicKey,
  ): BidModel {
    const price = solFromLamports(amount);
    const tokens = token(1, 0, symbol); // only considers nfts
    const tokenAccount = this.metaplex.tokens().pdas().associatedTokenAccount({
      mint: address,
      owner: seller,
    });

    const tradeStateAddress = this.metaplex.auctionHouse().pdas().tradeState({
      auctionHouse: auctionHouse.address,
      wallet: buyerAddress,
      treasuryMint: auctionHouse.treasuryMint.address,
      tokenMint: address,
      price: price.basisPoints,
      tokenSize: tokens.basisPoints,
      tokenAccount,
    });
    return {
      asset: {
        token: { address: tokenAccount },
        address,
      },
      buyerAddress,
      tradeStateAddress,
      price,
      tokens,
      auctionHouse,
    };
  }
}
