import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { AuctionHouseService } from './auction-house.service';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { ListParams } from './dto/list-params.dto';
import { PublicKey } from '@metaplex-foundation/js';
import { PrivateBidParams } from './dto/private-bid-params.dto';
import { ExecuteSaleParams } from './dto/execute-sale-params.dto';
import { AuctionHouseGuard } from 'src/guards/auction-house-update.guard';
import { Wallet } from '@prisma/client';
import { CancelParams } from './dto/cancel-bid-params.dto';

@UseGuards(RestAuthGuard, AuctionHouseGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Auction House')
@Controller('auction-house')
export class AuctionHouseController {
  constructor(private readonly auctionHouseService: AuctionHouseService) {}

  @Get('/transactions/construct/list')
  async constructListTransaction(
    @WalletEntity() wallet: Wallet,
    @Query() query: ListParams,
  ) {
    const publicKey = new PublicKey(wallet.address);
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'false' ? false : true;
    return await this.auctionHouseService.constructListTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
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
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return await this.auctionHouseService.constructPrivateBidTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
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
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return await this.auctionHouseService.constructExecutelistedSale(
      publicKey,
      listReceipt,
      bidReceipt,
      printReceipt,
    );
  }

  @Get('/transactions/construct/cancel-bid')
  async constructCancelBidTransaction(@Query() query: CancelParams) {
    const receiptAddress = new PublicKey(query.receiptAddress);
    return await this.auctionHouseService.constructCancelBidTransaction(
      receiptAddress,
    );
  }

  @Get('/transactions/construct/cancel-listing')
  async constructCancelListingTransaction(@Query() query: CancelParams) {
    const receiptAddress = new PublicKey(query.receiptAddress);
    return await this.auctionHouseService.constructCancelListingTransaction(
      receiptAddress,
    );
  }
}
