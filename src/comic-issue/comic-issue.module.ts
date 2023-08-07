import { Module } from '@nestjs/common';
import { ComicIssueService } from './comic-issue.service';
import { ComicIssueCreatorController } from './comic-issue-creator.controller';
import { ComicIssueUserController } from './comic-issue-user.controller';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';
import { UserComicIssueService } from './user-comic-issue.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { WebSocketGateway } from 'src/websockets/websocket.gateway';
import { DarkblockService } from 'src/candy-machine/darkblock.service';

@Module({
  controllers: [ComicIssueUserController, ComicIssueCreatorController],
  providers: [
    ComicIssueService,
    ComicPageService,
    CandyMachineService,
    UserComicIssueService,
    HeliusService,
    WebSocketGateway,
    DarkblockService,
  ],
})
export class ComicIssueModule {}
