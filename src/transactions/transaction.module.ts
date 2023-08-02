import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { CandyMachineService } from '../candy-machine/candy-machine.service';

@Module({
  controllers: [TransactionController],
  providers: [CandyMachineService],
})
export class CandyMachineModule {}
