import { Module } from '@nestjs/common';
import { InvestController } from './invest.controller';
import { InvestService } from './invest.service';

@Module({
  controllers: [InvestController],
  providers: [InvestService],
})
export class InvestModule {}
