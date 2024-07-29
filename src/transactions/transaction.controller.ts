import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { MintParams } from '../candy-machine/dto/mint-params.dto';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { SignComicParams } from './dto/sign-comic-params.dto';
import { UseComicParams } from '../candy-machine/dto/use-comic-params.dto';
import { CancelParams } from '../auction-house/dto/cancel-params.dto';
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
import { PublicKey, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PUBLIC_GROUP_LABEL } from '../constants';
import { TransactionService } from './transaction.service';
import { TransferTokensParams } from './dto/transfer-tokens-params.dto';
import { UserAuth } from '../guards/user-auth.guard';
import { UserEntity } from '../decorators/user.decorator';
import { UserPayload } from '../auth/dto/authorization.dto';
import { OptionalUserAuth } from 'src/guards/optional-user-auth.guard';
import { ActionPayloadDto } from 'src/blink/dto/action-payload.dto';
import { toActionResponseDto } from 'src/blink/dto/action-response.dto';
import { BlinkService } from 'src/blink/blink.service';
import { DigitalAssetService } from 'src/digital-asset/digital-asset.service';
import {
  CreatePrintEditionCollectionBodyDto,
  CreatePrintEditionCollectionDto,
} from 'src/digital-asset/dto/create-edition.dto';
import { BaseMetadataFilesDto } from 'src/digital-asset/dto/base-metadata.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiFileWithBody } from 'src/decorators/api-file-body.decorator';

@UseGuards(ThrottlerGuard)
@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly blinkService: BlinkService,
    private readonly auctionHouseService: AuctionHouseService,
    private readonly transactionService: TransactionService,
    private readonly digitalAssetService: DigitalAssetService,
  ) {}

  /** @deprecated */
  @OptionalUserAuth()
  @Get('/mint-one')
  async constructMintOneTransaction(
    @Query() query: MintParams,
    @UserEntity() user?: UserPayload,
  ) {
    const publicKey = new PublicKey(query.minterAddress);
    const candyMachineAddress = new PublicKey(query.candyMachineAddress);
    const label = query.label ?? PUBLIC_GROUP_LABEL;

    return await this.candyMachineService.createMintOneTransaction(
      publicKey,
      candyMachineAddress,
      label,
      user ? user.id : null,
    );
  }

  /* For blink clients to make request for mint transaction */
  @Post('/blink/mint/:candyMachine')
  async constructBlinkMintTransaction(
    @Param('candyMachine') candyMachine: string,
    @Body() actionPayload: ActionPayloadDto,
  ) {
    const publicKey = new PublicKey(actionPayload.account);
    const candyMachineAddress = new PublicKey(candyMachine);
    const label = PUBLIC_GROUP_LABEL;

    const transaction = await this.candyMachineService.createMintOneTransaction(
      publicKey,
      candyMachineAddress,
      label,
    );

    //todo: blink supports only single transaction
    return toActionResponseDto(transaction.at(-1));
  }

  /* For blink clients to make request for comic sign transaction */
  @Post('/blink/comic-sign/:address')
  async constructBlinkComicSignTransaction(
    @Param('address') address: string,
    @Body() actionPayload: ActionPayloadDto,
  ) {
    const assetAddress = new PublicKey(address);
    const publicKey = new PublicKey(actionPayload.account);

    const transaction = await this.blinkService.signComicAction(
      assetAddress,
      publicKey,
    );

    return toActionResponseDto(transaction);
  }

  @OptionalUserAuth()
  @Get('/mint')
  async constructMintTransaction(
    @Query() query: MintParams,
    @UserEntity() user?: UserPayload,
  ) {
    const publicKey = new PublicKey(query.minterAddress);
    const candyMachineAddress = new PublicKey(query.candyMachineAddress);
    const label = query.label ?? PUBLIC_GROUP_LABEL;
    const mintCount = query.mintCount ? +query.mintCount : 1;
    return await this.candyMachineService.createMintTransaction(
      publicKey,
      candyMachineAddress,
      label,
      mintCount,
      user ? user.id : null,
    );
  }

  @Get('/sign-comic')
  async constructSignComicTransaction(@Query() query: SignComicParams) {
    const publicKey = new PublicKey(query.signerAddress);
    const assetPubkey = new PublicKey(query.assetAddress);

    return await this.transactionService.createChangeComicStateTransaction(
      assetPubkey,
      publicKey,
      ComicStateArgs.Sign,
    );
  }

  @Get('/tip-creator')
  async constructTipCreatorTransaction(@Query() query: TransferTokensParams) {
    const senderAddress = new PublicKey(query.senderAddress);
    const receiverAddress = new PublicKey(query.receiverAddress);
    const tokenAddress = query.tokenAddress
      ? new PublicKey(query.tokenAddress)
      : WRAPPED_SOL_MINT;
    const tippingTransaction =
      await this.transactionService.createTransferTransaction(
        senderAddress,
        receiverAddress,
        query.amount,
        tokenAddress,
      );
    return tippingTransaction;
    // at some point we might also add a query.isAnonymous which would use
    // Elusiv for private transaction if the user decided to do an anonymous tip
  }

  /* deprecated */
  @UserAuth()
  @Get('/use-comic-issue-nft')
  async constructUseComicTransaction(
    @Query() query: UseComicParams,
    @UserEntity() user: UserPayload,
  ) {
    const publicKey = new PublicKey(query.ownerAddress);
    const assetPubkey = new PublicKey(query.nftAddress ?? query.assetAddress);

    return await this.transactionService.createChangeComicStateTransaction(
      assetPubkey,
      publicKey,
      ComicStateArgs.Use,
      user.id,
    );
  }

  @UserAuth()
  @Get('/use-comic-issue-asset')
  async constructUseComicAssetTransaction(
    @Query() query: UseComicParams,
    @UserEntity() user: UserPayload,
  ) {
    const publicKey = new PublicKey(query.ownerAddress);
    const nftPubKey = new PublicKey(query.assetAddress);

    return await this.transactionService.createChangeComicStateTransaction(
      nftPubKey,
      publicKey,
      ComicStateArgs.Use,
      user.id,
    );
  }

  @Get('/list')
  async createListTransaction(@Query() query: ListParams) {
    const publicKey = new PublicKey(query.sellerAddress);
    const mintAccount = new PublicKey(query.mintAccount);
    const printReceipt = query.printReceipt == 'true' ? true : false;
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
    const buyArguments: BuyArgs = {
      buyer: new PublicKey(query.buyerAddress),
      mintAccount: new PublicKey(query.mintAccount),
    };
    return await this.auctionHouseService.createInstantBuyTransaction(
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
    return await this.auctionHouseService.createMultipleBuys(buyParams);
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
    const assetAddress = query.nftAddress ?? query.assetAddress;
    return await this.auctionHouseService.createCancelListingTransaction(
      receiptAddress,
      assetAddress,
    );
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Post('/edition/mint-collection')
  async createPrintEditionCollectionTransaction(
    @ApiFileWithBody({
      fileField: 'image',
      fileType: BaseMetadataFilesDto,
      bodyType: CreatePrintEditionCollectionBodyDto,
    })
    createPrintEditionCollectionDto: CreatePrintEditionCollectionDto,
  ) {
    return await this.digitalAssetService.createPrintEditionCollectionTransaction(
      createPrintEditionCollectionDto,
    );
  }
}
