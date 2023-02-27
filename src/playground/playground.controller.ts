import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { AuctionHouseService } from 'src/vendors/auction-house.service';
import { CandyMachineService } from 'src/vendors/candy-machine.service';
import { Wallet } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import { MintOneParams } from './dto/mint-one-params.dto';
import { ListParams } from './dto/list-params.dto';
import { PrivateBidParams } from './dto/private-bid-params.dto';
import { ExecuteSaleParams } from './dto/execute-sale-params.dto';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Playground')
@Controller('playground')
export class PlaygroundController {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly auctionHouseService: AuctionHouseService,
    private readonly prisma: PrismaService,
  ) {}

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Get('find-minted-nfts')
  async findMintedNfts(@Query() query: MintOneParams) {
    return await this.candyMachineService.findMintedNfts(
      query.candyMachineAddress,
    );
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
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

  /** WORK IN PROGRESS - proof of concept endpoint */
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

  @Get('/transactions/construct/list')
  async constructListTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: ListParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const mintAccount = new PublicKey(query.mintAccount);

    return await this.auctionHouseService.constructListTransaction(
      publicKey,
      mintAccount,
      query.price,
    );
  }

  @Get('/transactions/construct/private-bid')
  async constructPrivateBidTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: PrivateBidParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const seller = query.seller ? new PublicKey(query.seller) : null;
    const tokenAccount = query.tokenAccount
      ? new PublicKey(query.tokenAccount)
      : null;
    const mintAccount = new PublicKey(query.mintAccount);

    return await this.auctionHouseService.constructPrivateBidTransaction(
      publicKey,
      mintAccount,
      query.price,
      seller,
      tokenAccount,
    );
  }

  @Get('/transactions/execute-sale')
  async constructExecutelistedSale(
    @WalletEntity() wallet: Wallet,
    @Query() query: ExecuteSaleParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const bidReceipt = new PublicKey(query.bidReceipt);
    const listReceipt = new PublicKey(query.listReceipt);

    return await this.auctionHouseService.constructExecutelistedSale(
      publicKey,
      listReceipt,
      bidReceipt,
    );
  }
}
