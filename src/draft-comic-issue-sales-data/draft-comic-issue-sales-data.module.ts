import { Module } from '@nestjs/common';
import { DraftComicIssueSalesDataService } from './draft-comic-issue-sales-data.service';
import { DraftComicIssueSalesDataController } from './draft-comic-issue-sales-data.controller';

@Module({
  controllers: [DraftComicIssueSalesDataController],
  providers: [DraftComicIssueSalesDataService],
})
export class DraftComicIssueSalesDataModule {}
