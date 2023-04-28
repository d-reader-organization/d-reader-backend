import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { AuctionHouseService } from './auction-house.service';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { ListParams } from './dto/list-params.dto';
import { PublicKey } from '@metaplex-foundation/js';
import { PrivateBidParams } from './dto/private-bid-params.dto';
import { AuctionHouseGuard } from 'src/guards/auction-house-update.guard';
import { Wallet } from '@prisma/client';
import { CancelParams } from './dto/cancel-bid-params.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { toListingDtoArray } from './dto/listing.dto';
import { ListingFilterParams } from './dto/listing-fliter-params.dto';
import { toCollectionStats } from './dto/collection-stats.dto';
import { BuyParamsArray, InstantBuyParams } from './dto/instant-buy-params.dto';
import { SilentQuery } from 'src/decorators/silent-query.decorator';
import { validateAndFormatParams } from '../utils/validate-params';
import { BuyArgs } from './dto/types/buy-args';

@UseGuards(RestAuthGuard, AuctionHouseGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Auction House')
@Controller('auction-house')
export class AuctionHouseController {
  constructor(private readonly auctionHouseService: AuctionHouseService) {}

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

  @Get('/transactions/private-bid')
  async constructPrivateBidTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: PrivateBidParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const seller = query.seller ? new PublicKey(query.seller) : null;
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return await this.auctionHouseService.constructPrivateBidTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
      seller,
    );
  }

  @Get('/transactions/instant-buy')
  async constructInstantBuyTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: InstantBuyParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const buyArgs: BuyArgs = {
      mintAccount: new PublicKey(query.mintAccount),
      price: query.price,
      seller: new PublicKey(query.seller),
    };
    return await this.auctionHouseService.constructInstantBuyTransaction(
      publicKey,
      buyArgs,
    );
  }

  @Get('/transactions/multiple-buy')
  @ApiQuery({
    name: 'query',
    type: BuyParamsArray,
  })
  async constructMultipleBuys(
    @WalletEntity() wallet: Wallet,
    @SilentQuery() query: BuyParamsArray,
  ) {
    const buyParams = validateAndFormatParams(query.instantBuyParams);
    const publicKey = new PublicKey(wallet.address);
    return await this.auctionHouseService.constructMultipleBuys(
      publicKey,
      buyParams,
    );
  }

  @Get('/transactions/cancel-bid')
  async constructCancelBidTransaction(@Query() query: CancelParams) {
    const receiptAddress = new PublicKey(query.receiptAddress);
    return await this.auctionHouseService.constructCancelBidTransaction(
      receiptAddress,
    );
  }

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

  @Get('/get/listings/:comicIssueId')
  async findAllListings(
    @Query() query: ListingFilterParams,
    @Param('comicIssueId') comicIssueId: string,
  ) {
    const listings = await this.auctionHouseService.findAllListings(
      query,
      +comicIssueId,
    );
    return await toListingDtoArray(listings);
  }

  @Get('/get/collection-stats/:comicIssueId')
  async findCollectionStats(@Param('comicIssueId') comicIssueId: string) {
    const stats = await this.auctionHouseService.findCollectionStats(
      +comicIssueId,
    );
    return toCollectionStats(stats);
  }
}
