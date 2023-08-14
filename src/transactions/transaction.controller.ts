import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { MintOneParams } from '../candy-machine/dto/mint-one-params.dto';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { SignComicParams } from '../candy-machine/dto/sign-comic-params.dto';
import { UseComicParams } from '../candy-machine/dto/use-comic-params.dto';
import { CancelParams } from '../auction-house/dto/cancel-bid-params.dto';
import { ListParams } from '../auction-house/dto/list-params.dto';
import { PrivateBidParams } from '../auction-house/dto/private-bid-params.dto';
import { BuyArgs } from '../auction-house/dto/types/buy-args';
import { SilentQuery } from '../decorators/silent-query.decorator';
import { validateAndFormatParams } from '../utils/validate-params';
import {
  InstantBuyParams,
  BuyParamsArray,
} from '../auction-house/dto/instant-buy-params.dto';
import { ComicStateArgs } from 'dreader-comic-verse';
import { PublicKey } from '@metaplex-foundation/js';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@UseGuards(ThrottlerGuard)
@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly auctionHouseService: AuctionHouseService,
  ) {}

  @Get('/mint-one')
  async constructMintOneTransaction(@Query() query: MintOneParams) {
    const publicKey = new PublicKey(query.minterAddress);
    const candyMachineAddress = new PublicKey(query.candyMachineAddress);

    return await this.candyMachineService.createMintOneTransaction(
      publicKey,
      candyMachineAddress,
    );
  }

  @Get('/sign-comic')
  async constructSignComicTransaction(@Query() query: SignComicParams) {
    const publicKey = new PublicKey(query.signerAddress);
    const nftPubKey = new PublicKey(query.nftAddress);

    return await this.candyMachineService.createChangeComicStateTransaction(
      nftPubKey,
      publicKey,
      ComicStateArgs.Sign,
    );
  }

  @Get('/use-comic-issue-nft')
  async constructUseComicTransaction(@Query() query: UseComicParams) {
    const publicKey = new PublicKey(query.ownerAddress);
    const nftPubKey = new PublicKey(query.nftAddress);

    return await this.candyMachineService.createChangeComicStateTransaction(
      nftPubKey,
      publicKey,
      ComicStateArgs.Use,
    );
  }

  @Get('/list')
  async createListTransaction(@Query() query: ListParams) {
    const publicKey = new PublicKey(query.sellerAddress);
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return await this.auctionHouseService.createListTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
    );
  }

  @Get('/private-bid')
  async createPrivateBidTransaction(@Query() query: PrivateBidParams) {
    const publicKey = new PublicKey(query.buyerAddress);
    const seller = query.sellerAddress
      ? new PublicKey(query.sellerAddress)
      : null;
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'false' ? false : true;

    return await this.auctionHouseService.createPrivateBidTransaction(
      publicKey,
      mintAccount,
      query.price,
      printReceipt,
      seller,
    );
  }

  @Get('/instant-buy')
  async createInstantBuyTransaction(@Query() query: InstantBuyParams) {
    const publicKey = new PublicKey(query.buyerAddress);
    const buyArguments: BuyArgs = {
      mintAccount: new PublicKey(query.mintAccount),
      price: query.price,
      seller: new PublicKey(query.sellerAddress),
    };
    return await this.auctionHouseService.createInstantBuyTransaction(
      publicKey,
      buyArguments,
    );
  }

  @Get('/multiple-buy')
  @ApiQuery({
    name: 'query',
    type: BuyParamsArray,
  })
  async createMultipleBuys(@SilentQuery() query: BuyParamsArray) {
    const buyParams = validateAndFormatParams(query.instantBuyParams);
    const publicKey = new PublicKey(query[0].buyer);
    return await this.auctionHouseService.createMultipleBuys(
      publicKey,
      buyParams,
    );
  }

  @Get('/cancel-bid')
  async createCancelBidTransaction(@Query() query: CancelParams) {
    const receiptAddress = new PublicKey(query.receiptAddress);
    return await this.auctionHouseService.createCancelBidTransaction(
      receiptAddress,
    );
  }

  @Get('/cancel-listing')
  async createCancelListingTransaction(@Query() query: CancelParams) {
    const receiptAddress = query.receiptAddress
      ? new PublicKey(query.receiptAddress)
      : undefined;
    const nftAddress = query.nftAddress ?? undefined;
    return await this.auctionHouseService.createCancelListingTransaction(
      receiptAddress,
      nftAddress,
    );
  }
}
