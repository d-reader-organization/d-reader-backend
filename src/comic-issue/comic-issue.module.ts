import { Module } from '@nestjs/common';
import { ComicIssueService } from './comic-issue.service';
import { ComicIssueController } from './comic-issue.controller';
import { ComicPageService } from '../comic-page/comic-page.service';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { UserComicIssueService } from './user-comic-issue.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { DarkblockService } from '../candy-machine/darkblock.service';
import { NonceService } from '../nonce/nonce.service';

@Module({
  controllers: [ComicIssueController],
  providers: [
    ComicIssueService,
    ComicPageService,
    CandyMachineService,
    UserComicIssueService,
    HeliusService,
    DarkblockService,
    NonceService,
  ],
})
export class ComicIssueModule {}
