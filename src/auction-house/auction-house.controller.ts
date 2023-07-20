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
import { FilterParams } from './dto/listing-fliter-params.dto';
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
  createListTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: ListParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return this.auctionHouseService.createListTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
    );
  }

  @Get('/transactions/private-bid')
  createPrivateBidTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: PrivateBidParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const seller = query.seller ? new PublicKey(query.seller) : null;
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return this.auctionHouseService.createPrivateBidTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
      seller,
    );
  }

  @Get('/transactions/instant-buy')
  createInstantBuyTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: InstantBuyParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const buyArguments: BuyArgs = {
      mintAccount: new PublicKey(query.mintAccount),
      price: query.price,
      seller: new PublicKey(query.seller),
    };
    return this.auctionHouseService.createInstantBuyTransaction(
      publicKey,
      buyArguments,
    );
  }

  @Get('/transactions/multiple-buy')
  @ApiQuery({
    name: 'query',
    type: BuyParamsArray,
  })
  createMultipleBuys(
    @WalletEntity() wallet: Wallet,
    @SilentQuery() query: BuyParamsArray,
  ) {
    const buyParams = validateAndFormatParams(query.instantBuyParams);
    const publicKey = new PublicKey(wallet.address);
    return this.auctionHouseService.createMultipleBuys(publicKey, buyParams);
  }

  @Get('/transactions/cancel-bid')
  createCancelBidTransaction(@Query() query: CancelParams) {
    const receiptAddress = new PublicKey(query.receiptAddress);
    return this.auctionHouseService.createCancelBidTransaction(receiptAddress);
  }

  @Get('/transactions/cancel-listing')
  createCancelListingTransaction(@Query() query: CancelParams) {
    const receiptAddress = query.receiptAddress
      ? new PublicKey(query.receiptAddress)
      : undefined;
    const mint = query.mint ?? undefined;
    return this.auctionHouseService.createCancelListingTransaction(
      receiptAddress,
      mint,
    );
  }

  @Get('/get/listings/:comicIssueId')
  async findAllListings(
    @Query() query: FilterParams,
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
