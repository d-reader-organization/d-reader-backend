import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { AuctionHouseService } from './auction-house.service';
import { AuctionHouseGuard } from 'src/guards/auction-house-update.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { toListingDtoArray } from './dto/listing.dto';
import { FilterParams } from './dto/listing-fliter-params.dto';
import { toCollectionStats } from './dto/collection-stats.dto';

@UseGuards(RestAuthGuard, AuctionHouseGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Auction House')
@Controller('auction-house')
export class AuctionHouseController {
  constructor(private readonly auctionHouseService: AuctionHouseService) {}

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

  @Get('/get/collection-stats/:comicIssueId')
  async findCollectionStats(@Param('comicIssueId') comicIssueId: string) {
    const stats = await this.auctionHouseService.findCollectionStats(
      +comicIssueId,
    );
    return toCollectionStats(stats);
  }
}
