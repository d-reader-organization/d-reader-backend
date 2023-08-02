import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { CandyMachineService } from './candy-machine.service';
import { MintOneParams } from '../candy-machine/dto/mint-one-params.dto';
import { CandyMachineReceiptParams } from '../candy-machine/dto/candy-machine-receipt-params.dto';
import { CandyMachineUpdateGuard } from 'src/guards/candy-machine-update.guard';
import {
  CandyMachineReceiptDto,
  toCMReceiptDtoArray,
} from '../candy-machine/dto/candy-machine-receipt.dto';
import { toCandyMachineDto } from '../candy-machine/dto/candy-machine.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(RestAuthGuard, CandyMachineUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(private readonly candyMachineService: CandyMachineService) {}

  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
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

  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('get/:address')
  async findByAddress(@Param('address') address: string) {
    const candyMachine = await this.candyMachineService.findByAddress(address);
    return toCandyMachineDto(candyMachine);
  }
}
