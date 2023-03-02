import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from 'nestjs-prisma';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { CandyMachineService } from './candy-machine.service';
import { MintOneParams } from './dto/mint-one-params.dto';
import { PublicKey } from '@metaplex-foundation/js';
import { Wallet } from '@prisma/client';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipts.dto';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('find-minted-nfts')
  async findMintedNfts(@Query() query: MintOneParams) {
    return await this.candyMachineService.findMintedNfts(
      query.candyMachineAddress,
    );
  }

  @Get('create-candy-machine')
  async createCandyMachine() {
    const comic = await this.prisma.comic.findFirst();
    const comicIssue = await this.prisma.comicIssue.findFirst();
    const creator = await this.prisma.creator.findFirst();
    return await this.candyMachineService.createComicIssueCM(
      comic,
      comicIssue,
      creator,
    );
  }

  @Get('/transactions/construct/mint-one')
  async constructMintOneTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: MintOneParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    return await this.candyMachineService.constructMintOneTransaction(
      publicKey,
      query.candyMachineAddress,
    );
  }

  @Get('get/receipts')
  async findReceipts(@Query() query: CandyMachineReceiptParams) {
    return await this.candyMachineService.findReceipts(query);
  }

  @Get('get/:address')
  async findByAddress(@Param('address') address: string) {
    return await this.candyMachineService.findByAddress(address);
  }
}
