import { Module } from '@nestjs/common';
import { AirdropSolCommand } from './airdrop-sol-command';
import { CreateAuctionHouseCommand } from './create-auction-house-command';
import { GenerateEnvironmentCommand } from './generate-environment-command';

@Module({
  providers: [
    GenerateEnvironmentCommand,
    CreateAuctionHouseCommand,
    AirdropSolCommand,
  ],
})
export class CLIModule {}
