import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TwitterService } from './twitter.service';
import {
  IntentComicMintedParams,
  UtmSource,
} from './dto/intent-comic-minted-params.dto';

@ApiTags('Twitter')
@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService) {}

  @Get('intent/comic-minted')
  async getTwitterIntentComicMinted(
    @Query() intentComicMintedParams: IntentComicMintedParams,
  ): Promise<string> {
    const utmSource = intentComicMintedParams.utmSource ?? UtmSource.Web;
    return await this.twitterService.getTwitterIntentComicMinted(
      intentComicMintedParams.comicAddress,
      utmSource,
    );
  }

  @Get('intent/issue-spotlight/:id')
  async getTwitterIntentComicIssueSpotlight(
    @Param('id') id: string,
  ): Promise<string> {
    return await this.twitterService.getTwitterIntentIssueSpotlight(+id);
  }
}
