import { Module } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { CreatorController } from './creator.controller';
import { WalletCreatorService } from './wallet-creator.service';

@Module({
  controllers: [CreatorController],
  providers: [CreatorService, WalletCreatorService],
})
export class CreatorModule {}
