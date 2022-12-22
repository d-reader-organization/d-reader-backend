import { Module } from '@nestjs/common';
import { AirdropSolCommand } from './airdrop-sol-command';
import { CreateAuctionHouseCommand } from './create-auction-house-command';
import { GenerateEnvironmentCommand } from './generate-environment-command';
import { ConfigModule } from '@nestjs/config';
import config from '../configs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [config] })],
  providers: [
    GenerateEnvironmentCommand,
    CreateAuctionHouseCommand,
    AirdropSolCommand,
  ],
})
export class CLIModule {}
