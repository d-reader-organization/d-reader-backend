import { Injectable } from '@nestjs/common';
import {
  Cluster,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  AuctionHouse,
  Bid,
  keypairIdentity,
  Listing,
  Metaplex,
  sol,
  token,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import {
  constructCancelBidInstruction,
  constructCancelListingInstruction,
  constructListInstruction,
  constructPrivateBidInstruction,
} from './instructions';
import { heliusClusterApiUrl } from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { CollectionStats, ListingReceipt, Listings } from './dto/types';
import { ListingFilterParams } from './dto/listing-fliter-params.dto';
import { isBoolean } from 'lodash';

@Injectable()
export class AuctionHouseService {
  private readonly metaplex: Metaplex;
  private auctionHouseAddress: PublicKey;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = heliusClusterApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    const connection = new Connection(endpoint, 'confirmed');
    this.metaplex = new Metaplex(connection);
    this.auctionHouseAddress = new PublicKey(process.env.AUCTION_HOUSE_ADDRESS);

    const treasuryWallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const treasuryKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(treasuryWallet.toString(Utf8))),
    );

    this.metaplex.use(keypairIdentity(treasuryKeypair));
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

  async constructInstantBuyTransaction(
    mintAccount: PublicKey,
    buyer: PublicKey,
    price: number,
    seller: PublicKey,
    tokenAccount: PublicKey,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
      const bidTransaction = await this.constructPrivateBidTransaction(
        buyer,
        mintAccount,
        price,
        false,
        seller,
        tokenAccount,
      );
      const listingModel = await this.prisma.listing.findUnique({
        where: {
          nftAddress_canceledAt: {
            nftAddress: mintAccount.toString(),
            canceledAt: new Date(0),
          },
        },
        include: {
          nft: {
            select: {
              name: true,
              owner: true,
            },
          },
        },
      });
      if (!listingModel) {
        throw new Error(
          `cannot find any listing with mint ${mintAccount.toString()}`,
        );
      }
      const listing = this.toListing(auctionHouse, listingModel);
      const executeSaleTransactionBuilder = this.metaplex
        .auctionHouse()
        .builders()
        .executeSale(
          {
            auctionHouse,
            listing,
            bid,
            printReceipt: false,
          },
          { payer: this.metaplex.identity() },
        );
      const latestBlockhash =
        await this.metaplex.connection.getLatestBlockhash();
      const executeSaleTransaction =
        executeSaleTransactionBuilder.toTransaction(latestBlockhash);

      await sendAndConfirmTransaction(
        this.metaplex.connection,
        executeSaleTransaction,
        [this.metaplex.identity()],
      );
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

      const listInstruction = constructListInstruction(
        this.metaplex,
        auctionHouse,
        mintAccount,
        seller,
        sol(price),
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
        throw new Error(
          'seller or associated token account must be provided !',
        );
      }
      const auctionHouse = await this.findOurAuctionHouse();
      const bidInstruction = await constructPrivateBidInstruction(
        this.metaplex,
        auctionHouse,
        buyer,
        mintAccount,
        sol(price),
        token(1),
        printReceipt,
        seller,
        tokenAccount,
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
          include: {
            nft: {
              select: {
                name: true,
                ownerAddress: true,
              },
            },
          },
        });
        listing = this.toListing(auctionHouse, listingModel);
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

  async findCollectionStats(comicIssueId: number): Promise<CollectionStats> {
    const aggregate = this.prisma.listing.aggregate({
      where: {
        nft: { collectionNft: { comicIssueId } },
        soldAt: { not: null },
      },
      _sum: { price: true },
    });
    const countListed = this.prisma.listing.count({
      where: {
        nft: {
          collectionNft: {
            comicIssueId,
          },
        },
        canceledAt: new Date(0),
      },
    });
    const minListed = this.prisma.listing.findFirst({
      where: {
        nft: {
          collectionNft: {
            comicIssueId,
          },
        },
        canceledAt: new Date(0),
      },
      orderBy: {
        price: 'asc',
      },
      select: {
        price: true,
      },
    });

    try {
      const [{ _sum: totalVolume }, itemsListed, { price: floorPrice }] =
        await Promise.all([aggregate, countListed, minListed]);
      return {
        totalVolume: totalVolume.price || 0,
        itemsListed: itemsListed || 0,
        floorPrice: floorPrice || 0,
      };
    } catch (e) {
      console.log(e);
    }
  }

  async findAllListings(query: ListingFilterParams): Promise<Listings[]> {
    return await this.prisma.listing.findMany({
      where: {
        canceledAt: new Date(0),
        soldAt: isBoolean(query.isSold)
          ? {
              [query.isSold ? 'not' : 'equals']: null,
            }
          : undefined,
      },
      include: {
        nft: {
          select: {
            owner: true,
            name: true,
            uri: true,
          },
        },
      },
      take: query.take,
      skip: query.skip,
    });
  }

  toListing(auctionHouse: AuctionHouse, listingModel: ListingReceipt) {
    const address = new PublicKey(listingModel.nftAddress);
    const sellerAddress = new PublicKey(listingModel.nft.ownerAddress);
    const tokenAccount = this.metaplex.tokens().pdas().associatedTokenAccount({
      mint: address,
      owner: sellerAddress,
    });

    const price = sol(listingModel.price / LAMPORTS_PER_SOL);
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

    return {
      asset: {
        token: {
          address: tokenAccount,
        },
        address,
      },
      sellerAddress,
      tradeStateAddress,
      price,
      tokens,
    };
  }
}
