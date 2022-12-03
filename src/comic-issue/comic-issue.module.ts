import { Module } from '@nestjs/common';
import { ComicIssueService } from './comic-issue.service';
import { ComicIssueController } from './comic-issue.controller';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { MetaplexService } from 'src/vendors/metaplex.service';

@Module({
  controllers: [ComicIssueController],
  providers: [ComicIssueService, ComicPageService, MetaplexService],
})
export class ComicIssueModule {}
