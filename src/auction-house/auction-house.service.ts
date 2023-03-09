import { Injectable } from '@nestjs/common';
import {
  Cluster,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { keypairIdentity, Metaplex, sol, token } from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import {
  constructCancelBidInstruction,
  constructCancelListingInstruction,
  constructListInstruction,
  constructPrivateBidInstruction,
} from './instructions';
import { heliusClusterApiUrl } from 'helius-sdk';

@Injectable()
export class AuctionHouseService {
  private readonly metaplex: Metaplex;
  private auctionHouseAddress: PublicKey;

  constructor() {
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

  async constructCancelListingTransaction(receiptAddress: PublicKey) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();

      const listing = await this.metaplex
        .auctionHouse()
        .findListingByReceipt({ receiptAddress, auctionHouse });

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
}
