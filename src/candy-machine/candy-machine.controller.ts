import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CandyMachineService } from './candy-machine.service';
import { CandyMachineReceiptParams } from '../candy-machine/dto/candy-machine-receipt-params.dto';
import {
  CandyMachineReceiptDto,
  toCMReceiptDtoArray,
} from '../candy-machine/dto/candy-machine-receipt.dto';
import { toCandyMachineDto } from '../candy-machine/dto/candy-machine.dto';
import { CandyMachineParams } from './dto/candy-machine-params.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';

@UseGuards(ThrottlerGuard)
@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(private readonly candyMachineService: CandyMachineService) {}

  @Get('get/receipts')
  async findReceipts(
    @Query() query: CandyMachineReceiptParams,
  ): Promise<CandyMachineReceiptDto[]> {
    const receipts = await this.candyMachineService.findReceipts(query);
    return await toCMReceiptDtoArray(receipts);
  }

  @Get('get')
  async findByAddress(@Query() query: CandyMachineParams) {
    const candyMachine = await this.candyMachineService.find(query);
    return toCandyMachineDto(candyMachine);
  }
}
