import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { CandyMachineService } from './candy-machine.service';
import { MintOneParams } from './dto/mint-one-params.dto';
import { PublicKey } from '@metaplex-foundation/js';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import { CandyMachineUpdateGuard } from 'src/guards/candy-machine-update.guard';
import {
  CandyMachineReceiptDto,
  toCMReceiptDtoArray,
} from './dto/candy-machine-receipt.dto';
import { toCandyMachineDto } from './dto/candy-machine.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SignComicParams } from './dto/sign-comic-params.dto';
import { ComicStateArgs } from 'dreader-comic-verse';
import { UseComicParams } from './dto/use-comic-params.dto';

@UseGuards(CandyMachineUpdateGuard, ThrottlerGuard)
@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(private readonly candyMachineService: CandyMachineService) {}

  @Get('/transactions/mint-one')
  constructMintOneTransaction(@Query() query: MintOneParams) {
    const publicKey = new PublicKey(query.minterAddress);
    const candyMachineAddress = new PublicKey(query.candyMachineAddress);

    return this.candyMachineService.createMintOneTransaction(
      publicKey,
      candyMachineAddress,
    );
  }

  @Get('/transactions/sign-comic')
  constructSignComicTransaction(@Query() query: SignComicParams) {
    const publicKey = new PublicKey(query.signerAddress);
    const nftAddress = new PublicKey(query.nftAddress);

    return this.candyMachineService.createChangeComicStateTransaction(
      nftAddress,
      publicKey,
      ComicStateArgs.Sign,
    );
  }

  @Get('/transactions/use-comic-issue-nft')
  constructUseComicTransaction(@Query() query: UseComicParams) {
    const publicKey = new PublicKey(query.ownerAddress);
    const nftAddress = new PublicKey(query.nftAddress);

    return this.candyMachineService.createChangeComicStateTransaction(
      nftAddress,
      publicKey,
      ComicStateArgs.Use,
    );
  }

  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('get/minted-nfts')
  findMintedNfts(@Query() query: MintOneParams) {
    return this.candyMachineService.findMintedNfts(query.candyMachineAddress);
  }

  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
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
