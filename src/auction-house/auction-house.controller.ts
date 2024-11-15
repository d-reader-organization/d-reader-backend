import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuctionHouseService } from './auction-house.service';
import { toListingDtoArray } from './dto/listing.dto';
import { ListingFilterParams } from './dto/listing-fliter-params.dto';
import { toCollectionStats } from './dto/collection-stats.dto';

@ApiTags('Auction House')
@Controller('auction-house')
export class AuctionHouseController {
  constructor(private readonly auctionHouseService: AuctionHouseService) {}

  @Get('/get/listed-items')
  async findListedItems(@Query() query: ListingFilterParams) {
    const listedItems = await this.auctionHouseService.findListedItems(query);
    return await toListingDtoArray(listedItems);
  }

  @Get('/get/collection-stats/:comicIssueId')
  async findCollectionStats(@Param('comicIssueId') id: string) {
    const stats = await this.auctionHouseService.findCollectionStats(+id);
    return toCollectionStats(stats);
  }
}
