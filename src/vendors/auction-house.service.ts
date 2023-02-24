import { Injectable } from '@nestjs/common';
import {
  Cluster,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  IdentitySigner,
  keypairIdentity,
  Metaplex,
  sol,
  SolAmount,
  SplTokenAmount,
  token,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { clusterHeliusApiUrl } from 'src/utils/helius';
import {
  constructListInstruction,
  constructPrivateBidInstruction,
} from './instructions';

@Injectable()
export class AuctionHouseService {
  private readonly connection: Connection;
  private readonly metaplex: Metaplex;
  private auctionHouseAddress: PublicKey;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = clusterHeliusApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
    this.connection = new Connection(endpoint, 'confirmed');
    this.metaplex = new Metaplex(this.connection);
    this.auctionHouseAddress = new PublicKey(process.env.AUCTION_HOUSE_ADDRESS);

    const treasuryWallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const treasuryKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(treasuryWallet.toString(Utf8))),
    );

    this.metaplex.use(keypairIdentity(treasuryKeypair));
    // this.metaplex.use(awsStorage(s3Client, 'd-reader-nft-data'));
  }

  async findOurAuctionHouse() {
    return this.metaplex
      .auctionHouse()
      .findByAddress({ address: this.auctionHouseAddress });
  }

  // Execute Sale for a nft listed and agreed on the bid by seller
  async executeListedSale(
    address: PublicKey,
    buyer: PublicKey,
    receiptAddress: PublicKey,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
      const listing = await this.metaplex
        .auctionHouse()
        .findListingByReceipt({ receiptAddress, auctionHouse });

      const bid = await this.metaplex
        .auctionHouse()
        .findBidByReceipt({ receiptAddress, auctionHouse });

      const buyersBalance = await this.getBuyersBalance(buyer, address);

      if (buyersBalance < bid.price) {
        // CHECK
        throw new Error("Buyer don't have enough amount in his escrow !");
      }
      const executeSaleResponse = await this.metaplex
        .auctionHouse()
        .executeSale({
          auctionHouse,
          auctioneerAuthority: this.metaplex.identity(),
          listing,
          bid,
        });
      return executeSaleResponse;
    } catch (e) {
      console.log('Error while executing sale ', e);
    }
  }

  /* currently only list NFTs */
  async constructListTransaction(
    seller: PublicKey,
    mintAccount: PublicKey,
    price: number,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();

      const listInstruction = constructListInstruction(
        this.metaplex,
        auctionHouse,
        mintAccount,
        seller,
        sol(price),
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
    price: SolAmount | SplTokenAmount,
    seller?: PublicKey,
    tokenAccount?: PublicKey,
  ) {
    const auctionHouse = await this.findOurAuctionHouse();
    const bidInstruction = await constructPrivateBidInstruction(
      this.metaplex,
      auctionHouse,
      buyer,
      mintAccount,
      price,
      token(1),
      seller,
      tokenAccount,
    );
    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash();
    const bidTransaction = new Transaction({
      feePayer: buyer,
      ...latestBlockhash,
    }).add(...bidInstruction);

    const rawTransaction = bidTransaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return rawTransaction.toString('base64');
  }

  async createCancelBidTransaction(
    address: PublicKey,
    receiptAddress: PublicKey,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();

      const bid = await this.metaplex
        .auctionHouse()
        .findBidByReceipt({ receiptAddress, auctionHouse });
      const cancelBidResponse = await this.metaplex.auctionHouse().cancelBid({
        auctionHouse, // The Auction House in which to cancel Bid
        bid: bid, // The Bid to cancel/open-sauce-labs/d-reader-frontend
      });
      return cancelBidResponse.response;
    } catch (e) {
      console.log('Error while creating bidding transaction ', e);
    }
  }

  async createCancelListTransaction(
    address: PublicKey,
    receiptAddress: PublicKey,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
      const listing = await this.metaplex
        .auctionHouse()
        .findListingByReceipt({ receiptAddress, auctionHouse });
      const cancelListingResponse = await this.metaplex
        .auctionHouse()
        .cancelListing({
          auctionHouse, // The Auction House in which to cancel listing
          listing: listing, // The listing to cancel
        });

      return cancelListingResponse.response;
    } catch (e) {
      console.log('Error while creating cancel list transaction ', e);
    }
  }

  async getBuyersBalance(buyer: PublicKey, address: PublicKey) {
    try {
      return await this.metaplex.auctionHouse().getBuyerBalance({
        auctionHouse: address,
        buyerAddress: buyer, // The buyer's address
      });
    } catch (e) {
      console.log('Error while fetching buyers balance.', e);
    }
  }

  async depositBuytoEscrow(
    buyer: PublicKey,
    address: PublicKey,
    amount: number,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
      const depositBuilder = this.metaplex
        .auctionHouse()
        .builders()
        .depositToBuyerAccount({
          auctionHouse,
          buyer: { publicKey: buyer } as IdentitySigner,
          amount: sol(amount),
        });
      depositBuilder.setFeePayer({ publicKey: buyer } as IdentitySigner);
    } catch (e) {
      console.log('Error while fetching buyers balance.', e);
    }
  }

  async withdrawFundsFromFeeWallet(amount: number) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();

      const response = await this.metaplex
        .auctionHouse()
        .withdrawFromFeeAccount({
          auctionHouse,
          amount: sol(amount),
        });

      return response;
    } catch (e) {
      console.log('Errored while withdrawing funds from the fee wallet: ', e);
    }
  }

  async withdrawFundsFromTreasuryWallet(amount: number) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
      const response = await this.metaplex
        .auctionHouse()
        .withdrawFromTreasuryAccount({
          auctionHouse,
          amount: sol(amount),
        });

      return response;
    } catch (e) {
      console.log(
        'Errored while withdrawing funds from the treasury wallet: ',
        e,
      );
    }
  }
}
