import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CandyMachineService } from './candy-machine.service';
import { MintOneParams } from '../candy-machine/dto/mint-one-params.dto';
import { CandyMachineReceiptParams } from '../candy-machine/dto/candy-machine-receipt-params.dto';
import {
  CandyMachineReceiptDto,
  toCMReceiptDtoArray,
} from '../candy-machine/dto/candy-machine-receipt.dto';
import { toCandyMachineDto } from '../candy-machine/dto/candy-machine.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { toCandyMachineGroupDtoArray } from './dto/candy-machine-group.dto';
import { EligibleGroupsParams } from './dto/eligible-groups-params.dto';

@UseGuards(ThrottlerGuard)
@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(private readonly candyMachineService: CandyMachineService) {}

  @Get('get/minted-nfts')
  findMintedNfts(@Query() query: MintOneParams) {
    return this.candyMachineService.findMintedNfts(query.candyMachineAddress);
  }

  @Get('get/receipts')
  async findReceipts(
    @Query() query: CandyMachineReceiptParams,
  ): Promise<CandyMachineReceiptDto[]> {
    const receipts = await this.candyMachineService.findReceipts(query);
    return toCMReceiptDtoArray(receipts);
  }

  @Get('get/eligible-groups')
  async findWalletEligibleGroups(@Query() query: EligibleGroupsParams) {
    const groups = await this.candyMachineService.findWalletEligibleGroups(
      query,
    );
    return toCandyMachineGroupDtoArray(groups);
  }

  @Get('get/:address')
  async findByAddress(@Param('address') address: string) {
    const candyMachine = await this.candyMachineService.findByAddress(address);
    return toCandyMachineDto(candyMachine);
  }

  @Get('get/groups/:address')
  async findCandyMachineGroups(@Param('address') address: string) {
    const groups = await this.candyMachineService.findCandyMachineGroups(
      address,
    );
    return toCandyMachineGroupDtoArray(groups);
  }
}
