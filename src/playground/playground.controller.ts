import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { AuctionHouseService } from 'src/vendors/auction-house.service';
import { CandyMachineService } from 'src/vendors/candy-machine.service';
import { Wallet } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Playground')
@Controller('playground')
export class PlaygroundController {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly auctionHouseService: AuctionHouseService,
  ) {}

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Get('find-minted-nfts')
  async findMintedNfts() {
    return await this.candyMachineService.findMintedNfts();
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Get('create-candy-machine')
  async createCandyMachine() {
    return await this.candyMachineService.create();
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Get('mint-one')
  async mintOne() {
    return await this.candyMachineService.mintOne();
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Get('/transactions/construct/mint-one')
  async createMintTransaction(@WalletEntity() wallet: Wallet) {
    const publicKey = new PublicKey(wallet.address);
    return await this.candyMachineService.createMintTransaction(publicKey);
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Get('/transactions/construct/create-nft')
  async createNftTransaction(@WalletEntity() wallet: Wallet) {
    const publicKey = new PublicKey(wallet.address);
    return await this.candyMachineService.createNftTransaction(publicKey);
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Get('create-auction-house')
  async createAuctionHouse() {
    return await this.auctionHouseService.createAuctionHouse();
  }
}
