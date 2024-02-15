import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { AddAllowListDto } from './dto/add-allow-list.dto';
import { AdminGuard } from '../guards/roles.guard';
import { AddGroupDto } from './dto/add-group.dto';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';

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

  @AdminGuard()
  @Post('add-allow-list')
  async addAllowList(@Body() addAllowListDto: AddAllowListDto) {
    const { candyMachineAddress, label, allowList } = addAllowListDto;
    await this.candyMachineService.addAllowList(
      candyMachineAddress,
      allowList,
      label,
    );
  }

  @AdminGuard()
  @Post('add-group/:candyMachineAddress')
  async addGroup(
    @Param('candyMachineAddress') candyMachineAddress: string,
    @Body() addGroupDto: AddGroupDto,
  ) {
    const splTokenAddress =
      addGroupDto.splTokenAddress ?? WRAPPED_SOL_MINT.toBase58();
    await this.candyMachineService.addCandyMachineGroup(candyMachineAddress, {
      ...addGroupDto,
      splTokenAddress,
    });
  }
}
