import { Module } from '@nestjs/common';
import { ComicIssueService } from './comic-issue.service';
import { ComicIssueController } from './comic-issue.controller';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';
import { WalletComicIssueService } from './wallet-comic-issue.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { WebSocketGateway } from 'src/websockets/websocket.gateway';

@Module({
  controllers: [ComicIssueController],
  providers: [
    ComicIssueService,
    ComicPageService,
    CandyMachineService,
    WalletComicIssueService,
    HeliusService,
    WebSocketGateway,
  ],
})
export class ComicIssueModule {}
