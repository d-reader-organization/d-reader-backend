import { Module } from '@nestjs/common';
import { DigitalAssetService } from './digital-asset.service';
import {
  DigitalAssetController,
  NftController,
} from './digital-asset.controller';

@Module({
  controllers: [NftController, DigitalAssetController],
  providers: [DigitalAssetService],
})
export class DigitalAssetModule {}
