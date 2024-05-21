import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TwitterService } from './twitter.service';
import { IntentComicMintedParams } from './dto/intent-comic-minted-params.dto';

@ApiTags('Twitter')
@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService) {}

  @Get('intent/comic-minted')
  async getTwitterIntentComicMinted(
    @Query() intentComicMintedParams: IntentComicMintedParams,
  ): Promise<string> {
    const utmSource = intentComicMintedParams.utmSource ?? 'web';
    return await this.twitterService.getTwitterIntentComicMinted(
      intentComicMintedParams.comicAddress,
      utmSource,
    );
  }
}
