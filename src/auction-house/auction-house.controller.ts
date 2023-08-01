import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { AuctionHouseService } from './auction-house.service';
import { ListParams } from './dto/list-params.dto';
import { PublicKey } from '@metaplex-foundation/js';
import { PrivateBidParams } from './dto/private-bid-params.dto';
import { AuctionHouseGuard } from 'src/guards/auction-house-update.guard';
import { CancelParams } from './dto/cancel-bid-params.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { toListingDtoArray } from './dto/listing.dto';
import { FilterParams } from './dto/listing-fliter-params.dto';
import { toCollectionStats } from './dto/collection-stats.dto';
import { BuyParamsArray, InstantBuyParams } from './dto/instant-buy-params.dto';
import { SilentQuery } from 'src/decorators/silent-query.decorator';
import { validateAndFormatParams } from '../utils/validate-params';
import { BuyArgs } from './dto/types/buy-args';

@UseGuards(AuctionHouseGuard, ThrottlerGuard)
@ApiTags('Auction House')
@Controller('auction-house')
export class AuctionHouseController {
  constructor(private readonly auctionHouseService: AuctionHouseService) {}

  @Get('/transactions/list')
  createListTransaction(@Query() query: ListParams) {
    const publicKey = new PublicKey(query.sellerAddress);
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
  createPrivateBidTransaction(@Query() query: PrivateBidParams) {
    const publicKey = new PublicKey(query.buyerAddress);
    const seller = query.sellerAddress
      ? new PublicKey(query.sellerAddress)
      : null;
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
  createInstantBuyTransaction(@Query() query: InstantBuyParams) {
    const publicKey = new PublicKey(query.buyerAddress);
    const buyArguments: BuyArgs = {
      mintAccount: new PublicKey(query.mintAccount),
      price: query.price,
      seller: new PublicKey(query.sellerAddress),
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
  createMultipleBuys(@SilentQuery() query: BuyParamsArray) {
    const buyParams = validateAndFormatParams(query.instantBuyParams);
    const publicKey = new PublicKey(query[0].buyer);
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
    const nftAddress = query.nftAddress ?? undefined;
    return this.auctionHouseService.createCancelListingTransaction(
      receiptAddress,
      nftAddress,
    );
  }

  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
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

  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('/get/collection-stats/:comicIssueId')
  async findCollectionStats(@Param('comicIssueId') comicIssueId: string) {
    const stats = await this.auctionHouseService.findCollectionStats(
      +comicIssueId,
    );
    return toCollectionStats(stats);
  }
}
