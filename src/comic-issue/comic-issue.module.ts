import { Module } from '@nestjs/common';
import { ComicIssueService } from './comic-issue.service';
import { ComicIssueController } from './comic-issue.controller';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';
import { WalletComicIssueService } from './wallet-comic-issue.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';

@Module({
  controllers: [ComicIssueController],
  providers: [
    ComicIssueService,
    ComicPageService,
    CandyMachineService,
    WalletComicIssueService,
    HeliusService,
  ],
})
export class ComicIssueModule {}
