import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { AuctionHouseService } from './auction-house.service';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { ListParams } from './dto/list-params.dto';
import { PublicKey } from '@metaplex-foundation/js';
import { PrivateBidParams } from './dto/private-bid-params.dto';
import { ExecuteSaleParams } from './dto/execute-sale-params.dto';
import { AuctionHouseGuard } from 'src/guards/auction-house-update.guard';
import { Wallet } from '@prisma/client';
import { CancelParams } from './dto/cancel-bid-params.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { toListingDtoArray } from './dto/listing.dto';
import { ListingFilterParams } from './dto/listing-fliter-params.dto';
import { toCollectionStats } from './dto/collection-stats.dto';
import { InstantBuyParams } from './dto/instant-buy-params.dto';

@UseGuards(RestAuthGuard, AuctionHouseGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Auction House')
@Controller('auction-house')
export class AuctionHouseController {
  constructor(private readonly auctionHouseService: AuctionHouseService) {}

  @Throttle(5, 30)
  @Get('/transactions/list')
  async constructListTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: ListParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'false' ? false : true;
    return await this.auctionHouseService.constructListTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
    );
  }

  @Throttle(5, 30)
  @Get('/transactions/private-bid')
  async constructPrivateBidTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: PrivateBidParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const seller = query.seller ? new PublicKey(query.seller) : null;
    const tokenAccount = query.tokenAccount
      ? new PublicKey(query.tokenAccount)
      : null;
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return await this.auctionHouseService.constructPrivateBidTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
      seller,
      tokenAccount,
    );
  }

  @Throttle(5, 30)
  @Get('/transactions/execute-sale')
  async constructExecutelistedSale(
    @WalletEntity() wallet: Wallet,
    @Query() query: ExecuteSaleParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const bidReceipt = new PublicKey(query.bidReceipt);
    const listReceipt = new PublicKey(query.listReceipt);
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return await this.auctionHouseService.constructExecutelistedSale(
      publicKey,
      listReceipt,
      bidReceipt,
      printReceipt,
    );
  }

  @Throttle(5, 30)
  @Get('/transactions/instant-buy')
  async constructInstantBuy(
    @WalletEntity() wallet: Wallet,
    @Query() query: InstantBuyParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const mintAccount = new PublicKey(query.mint);
    const seller = query.seller ? new PublicKey(query.seller) : undefined;
    const tokenAccount = query.tokenAccount
      ? new PublicKey(query.tokenAccount)
      : undefined;

    return await this.auctionHouseService.constructInstantBuyTransaction(
      publicKey,
      mintAccount,
      query.price,
      seller,
      tokenAccount,
    );
  }

  @Throttle(5, 30)
  @Get('/transactions/cancel-bid')
  async constructCancelBidTransaction(@Query() query: CancelParams) {
    const receiptAddress = new PublicKey(query.receiptAddress);
    return await this.auctionHouseService.constructCancelBidTransaction(
      receiptAddress,
    );
  }

  @Throttle(5, 30)
  @Get('/transactions/cancel-listing')
  async constructCancelListingTransaction(@Query() query: CancelParams) {
    const receiptAddress = query.receiptAddress
      ? new PublicKey(query.receiptAddress)
      : undefined;
    const mint = query.mint ?? undefined;
    return await this.auctionHouseService.constructCancelListingTransaction(
      receiptAddress,
      mint,
    );
  }

  @Throttle(5, 30)
  @Get('/get/listings')
  async findAllListings(@Query() query: ListingFilterParams) {
    const listings = await this.auctionHouseService.findAllListings(query);
    return await toListingDtoArray(listings);
  }

  @Throttle(5, 30)
  @Get('/get/collection-stats/:comicIssueId')
  async findCollectionStats(@Param('comicIssueId') comicIssueId: string) {
    const stats = await this.auctionHouseService.findCollectionStats(
      +comicIssueId,
    );
    return toCollectionStats(stats);
  }
}
