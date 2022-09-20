import { Module } from '@nestjs/common';
import { ComicIssueService } from './comic-issue.service';
import { ComicIssueController } from './comic-issue.controller';
import { ComicPageService } from 'src/comic-page/comic-page.service';

@Module({
  controllers: [ComicIssueController],
  providers: [ComicIssueService, ComicPageService],
})
export class ComicIssueModule {}
