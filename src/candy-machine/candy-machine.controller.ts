import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
import { ThrottlerGuard } from '@nestjs/throttler';
import { ChangeComicStateParams } from './dto/change-comic-state-params.dto';
import { ComicStateArgs } from 'dreader-comic-verse';

@UseGuards(RestAuthGuard, CandyMachineUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(private readonly candyMachineService: CandyMachineService) {}

  @Get('find-minted-nfts')
  findMintedNfts(@Query() query: MintOneParams) {
    return this.candyMachineService.findMintedNfts(query.candyMachineAddress);
  }

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

  @Get('/transactions/sign-comic')
  constructSignComicTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: ChangeComicStateParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const collectionMint = new PublicKey(query.collectionNft);
    const candyMachineAddress = new PublicKey(query.candyMachineAddress);
    const mint = new PublicKey(query.mint);

    return this.candyMachineService.constructChangeComicStateTransaction(
      collectionMint,
      candyMachineAddress,
      query.rarity,
      mint,
      publicKey,
      ComicStateArgs.Sign,
    );
  }

  @Get('/transactions/use-comic')
  constructUseComicTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: ChangeComicStateParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const collectionMint = new PublicKey(query.collectionNft);
    const candyMachineAddress = new PublicKey(query.candyMachineAddress);
    const mint = new PublicKey(query.mint);

    return this.candyMachineService.constructChangeComicStateTransaction(
      collectionMint,
      candyMachineAddress,
      query.rarity,
      mint,
      publicKey,
      ComicStateArgs.Use,
    );
  }

  @Get('get/receipts')
  async findReceipts(
    @Query() query: CandyMachineReceiptParams,
  ): Promise<CandyMachineReceiptDto[]> {
    const receipts = await this.candyMachineService.findReceipts(query);
    return toCMReceiptDtoArray(receipts);
  }

  @Get('get/:address')
  async findByAddress(@Param('address') address: string) {
    const candyMachine = await this.candyMachineService.findByAddress(address);
    return toCandyMachineDto(candyMachine);
  }
}
