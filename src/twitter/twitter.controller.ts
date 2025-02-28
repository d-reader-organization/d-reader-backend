import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TwitterService } from './twitter.service';
import {
  IntentComicMintedParams,
  UtmSource,
} from './dto/intent-comic-minted-params.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { UserEntity } from 'src/decorators/user.decorator';

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

  @UserAuth()
  @Get('intent/expressed-interest/:slug')
  async getTwitterIntentExpressedInterest(
    @Param('slug') slug: string,
    @UserEntity() user: UserPayload,
  ): Promise<string> {
    return await this.twitterService.getTwitterIntentExpressedInterest(
      slug,
      user,
    );
  }
}
