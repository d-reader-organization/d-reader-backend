import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CandyMachineService } from './candy-machine.service';
import { CandyMachineReceiptParams } from '../candy-machine/dto/candy-machine-receipt-params.dto';
import {
  CandyMachineReceiptDto,
  toCMReceiptDtoArray,
} from '../candy-machine/dto/candy-machine-receipt.dto';
import { toCandyMachineDto } from '../candy-machine/dto/candy-machine.dto';
import { toWalletEligibleGroupDtoArray } from './dto/candy-machine-group.dto';
import { EligibleGroupsParams } from './dto/eligible-groups-params.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';

@UseGuards(ThrottlerGuard)
@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(private readonly candyMachineService: CandyMachineService) {}

  /* this endpoint is not used in production */
  @Get('get/minted-nfts/:address')
  async findMintedNfts(@Param('address') address: string) {
    return await this.candyMachineService.findMintedNfts(address);
  }

  @Get('get/receipts')
  async findReceipts(
    @Query() query: CandyMachineReceiptParams,
  ): Promise<CandyMachineReceiptDto[]> {
    const receipts = await this.candyMachineService.findReceipts(query);
    return await toCMReceiptDtoArray(receipts);
  }

  @Get('get/groups')
  async findGroups(@Query() query: EligibleGroupsParams) {
    const groups = await this.candyMachineService.findWalletEligibleGroups(
      query,
    );
    return toWalletEligibleGroupDtoArray(groups);
  }

  /**
   * Use get/eligible-groups instead
   * @deprecated */
  @Get('get/:address')
  async findByAddress(@Param('address') address: string) {
    const candyMachine = await this.candyMachineService.findByAddress(address);
    return toCandyMachineDto(candyMachine);
  }
}
