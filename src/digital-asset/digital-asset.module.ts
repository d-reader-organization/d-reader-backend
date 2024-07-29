import { Module } from '@nestjs/common';
import { DigitalAssetService } from './digital-asset.service';
import {
  DigitalAssetController,
  NftController,
} from './digital-asset.controller';
import { HeliusService } from '../webhooks/helius/helius.service';
import { NonceService } from '../nonce/nonce.service';

@Module({
  controllers: [NftController, DigitalAssetController],
  providers: [DigitalAssetService, HeliusService, NonceService],
})
export class DigitalAssetModule {}
