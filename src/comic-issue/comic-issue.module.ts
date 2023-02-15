import { Module } from '@nestjs/common';
import { ComicIssueService } from './comic-issue.service';
import { ComicIssueController } from './comic-issue.controller';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { MetaplexService } from 'src/vendors/metaplex.service';
import { CandyMachineService } from 'src/vendors/candy-machine.service';
import { WalletComicIssueService } from './wallet-comic-issue.service';

@Module({
  controllers: [ComicIssueController],
  providers: [
    ComicIssueService,
    ComicPageService,
    MetaplexService,
    CandyMachineService,
    WalletComicIssueService,
  ],
})
export class ComicIssueModule {}
