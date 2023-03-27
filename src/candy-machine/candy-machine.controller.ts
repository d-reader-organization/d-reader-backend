import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from 'nestjs-prisma';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { CandyMachineService } from './candy-machine.service';
import { MintOneParams } from './dto/mint-one-params.dto';
import { PublicKey } from '@metaplex-foundation/js';
import { Wallet } from '@prisma/client';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import { CandyMachineUpdateGuard } from 'src/guards/candy-machine-update.guard';
import {
  CandyMachineReceiptDto,
  toCMReceiptDtoArray,
} from './dto/candy-machine-receipt.dto';
import { toCandyMachineDto } from './dto/candy-machine.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(RestAuthGuard, CandyMachineUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('find-minted-nfts')
  findMintedNfts(@Query() query: MintOneParams) {
    return this.candyMachineService.findMintedNfts(query.candyMachineAddress);
  }

  @Throttle(5, 30)
  @Get('/transactions/mint-one')
  constructMintOneTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: MintOneParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const candyMachineAddress = new PublicKey(query.candyMachineAddress);

    return this.candyMachineService.constructMintOneTransaction(
      publicKey,
      candyMachineAddress,
    );
  }

  @Get('get/receipts')
  async findReceipts(
    @Query() query: CandyMachineReceiptParams,
  ): Promise<CandyMachineReceiptDto[]> {
    const receipts = await this.candyMachineService.findReceipts(query);
    return await toCMReceiptDtoArray(receipts);
  }

  @Get('get/:address')
  async findByAddress(@Param('address') address: string) {
    const candyMachine = await this.candyMachineService.findByAddress(address);
    return toCandyMachineDto(candyMachine);
  }
}
