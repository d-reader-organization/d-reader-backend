import { Injectable } from '@nestjs/common';
import {
  BlockhashWithExpiryBlockHeight,
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  IdentitySigner,
  keypairIdentity,
  Metaplex,
  sol,
  WRAPPED_SOL_MINT,
} from '@metaplex-foundation/js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { Cluster } from 'src/types/cluster';

@Injectable()
export class AuctionHouseService {
  private readonly connection: Connection;
  private readonly metaplex: Metaplex;
  private auctionHouseAddress: PublicKey;

  constructor(private readonly prisma: PrismaService) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_NODE_ENDPOINT,
      'confirmed',
    );
    this.metaplex = new Metaplex(this.connection);

    const treasuryWallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const treasuryKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(treasuryWallet.toString(Utf8))),
    );

    this.metaplex.use(keypairIdentity(treasuryKeypair));
    // this.metaplex.use()
    // .use(awsStorage(s3Client, 'd-reader-nft-data'));
  }

  async createAuctionHouse() {
    try {
      const response = await this.metaplex.auctionHouse().create({
        sellerFeeBasisPoints: 800, // 8%
        requiresSignOff: true,
        canChangeSalePrice: false,
        treasuryMint: WRAPPED_SOL_MINT,
        authority: this.metaplex.identity(),
        feeWithdrawalDestination: this.metaplex.identity().publicKey,
        treasuryWithdrawalDestinationOwner: this.metaplex.identity().publicKey,
        auctioneerAuthority: undefined, // out of scope for now
        auctioneerScopes: undefined,
      });

      const { auctionHouse } = response;
      this.auctionHouseAddress = auctionHouse.address;

      if (process.env.SOLANA_CLUSTER !== Cluster.MainnetBeta) {
        await this.metaplex
          .rpc()
          .airdrop(auctionHouse.feeAccountAddress, sol(2));
      }

      return response;
    } catch (e) {
      console.log('Errored while creating the auction house: ', e);
    }
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

  // Currently handles only price greater than 0, need to assign auction house authority as signer for changing price if someone listed at 0
  async createListingTransaction(
    seller: PublicKey,
    address: PublicKey,
    mintAccount: PublicKey,
    tokenAccount: PublicKey,
    price: number,
    blockhash?: BlockhashWithExpiryBlockHeight,
  ) {
    try {
      const auctionHouse = await this.findOurAuctionHouse();
      const listingBuilder = this.metaplex
        .auctionHouse()
        .builders()
        .list({
          auctionHouse,
          seller: { publicKey: seller } as IdentitySigner,
          mintAccount,
          tokenAccount,
          price: sol(price),
          bookkeeper: this.metaplex.identity(),
          printReceipt: true,
          //default tokens is 1 , which is fine for nfts
        });

      if (!blockhash) blockhash = await this.connection.getLatestBlockhash();
      listingBuilder.setFeePayer({ publicKey: seller } as IdentitySigner);
      const listingTransaction = listingBuilder.toTransaction(blockhash);
      listingTransaction.partialSign(this.metaplex.identity()); // CHECK

      const rawTransaction = listingTransaction.serialize({
        requireAllSignatures: false,
      });

      return rawTransaction.toString('base64');
    } catch (e) {
      console.log('Error while creating listing transaction ', e);
    }
  }

  /* Add a Buy Transaction where user buy on the listed price */

  /*  public bid if seller and token Account is missing else private bid*/
  async createBidTransaction(
    buyer: PublicKey,
    address: PublicKey,
    mintAccount: PublicKey,
    price: number,
    seller?: PublicKey,
    tokenAccount?: PublicKey,
    blockhash?: BlockhashWithExpiryBlockHeight,
  ) {
    // deposit the amount in escrow
    try {
      const buyersBalance = await this.getBuyersBalance(buyer, address);
      if (buyersBalance < sol(price)) {
        // CHECK
        throw new Error(
          "Buyer don't have enough amount in escrow to create a bid",
        );
      }
      const auctionHouse = await this.findOurAuctionHouse();
      const bidBuilder = await this.metaplex
        .auctionHouse()
        .builders()
        .bid({
          auctionHouse,
          buyer: { publicKey: buyer } as IdentitySigner,
          price: sol(price),
          authority: this.metaplex.identity(),
          mintAccount,
          seller, // undefined if public big
          tokenAccount,
          //default tokens is 1 , which is fine for nfts
        });

      if (!blockhash) blockhash = await this.connection.getLatestBlockhash();
      bidBuilder.setFeePayer({ publicKey: buyer } as IdentitySigner);
      const bidTransaction = bidBuilder.toTransaction(blockhash);
      bidTransaction.partialSign(this.metaplex.identity()); // CHECK

      const rawTransaction = bidTransaction.serialize({
        requireAllSignatures: false,
      });

      return rawTransaction.toString('base64');
    } catch (e) {
      console.log('Error while creating bidding transaction ', e);
    }
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
