import { Module } from '@nestjs/common';
import { AirdropSolCommand } from './airdrop-sol-command';
import { GenerateEnvironmentCommand } from './generate-environment-command';
import { ConfigModule } from '@nestjs/config';
import { EnvironmentQuestions } from './environment-questions';
import config from '../configs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [config] })],
  providers: [
    GenerateEnvironmentCommand,
    AirdropSolCommand,
    EnvironmentQuestions,
  ],
})
export class CLIModule {}
