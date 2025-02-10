import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { MintParams } from '../candy-machine/dto/mint-params.dto';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { UseComicParams } from '../candy-machine/dto/use-comic-params.dto';
import {
  ListParams,
  TimedAuctionListParams,
} from '../auction-house/dto/list-params.dto';
import { BidParams } from '../auction-house/dto/bid-params.dto';
import { SilentQuery } from '../decorators/silent-query.decorator';
import { validateAndFormatParams } from '../utils/validate-params';
import { MultipleBuyParams } from '../auction-house/dto/instant-buy-params.dto';
import { PublicKey, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
} from 'src/digital-asset/dto/create-print-edition.dto';
import { BaseMetadataFilesDto } from 'src/digital-asset/dto/base-metadata.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiFilesWithBody } from '../decorators/api-file-body.decorator';
import {
  CreateOneOfOneBodyDto,
  CreateOneOfOneDto,
} from 'src/digital-asset/dto/create-one-of-one.dto';
import {
  CreateOneOfOneCollectionBodyDto,
  CreateOneOfOneCollectionDto,
  CreateOneOfOneCollectionFilesDto,
} from 'src/digital-asset/dto/create-one-of-one-collection.dto';
import { DigitalAssetCreateTransactionDto } from 'src/digital-asset/dto/digital-asset-transaction.dto';
import { publicKey } from '@metaplex-foundation/umi';
import { SendMintTransactionBodyDto } from './dto/send-mint-transaction.dto';
// import { MutexInterceptor } from 'src/mutex/mutex.interceptor';
import {
  MINT_MUTEX_IDENTIFIER,
  SOL_ADDRESS,
  STRICT_THROTTLER_CONFIG,
} from 'src/constants';
import { RepriceListingParams } from 'src/auction-house/dto/reprice-listing-params.dto';
import { InitializePrintEditionSaleParams } from 'src/auction-house/dto/initialize-edition-sale-params.dto';
import { BuyPrintEditionParams } from 'src/auction-house/dto/buy-print-edition-params';
import { InvestService } from 'src/invest/invest.service';
import { ExpressInterestTransactionParams } from 'src/invest/dto/express-interest-transaction-params.dto';
import { GlobalThrottlerInterceptor } from 'src/interceptor/global-throttler-interceptor';
import { Throttle } from '@nestjs/throttler';
import { MutexInterceptor } from 'src/mutex/mutex.interceptor';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly blinkService: BlinkService,
    private readonly auctionHouseService: AuctionHouseService,
    private readonly transactionService: TransactionService,
    private readonly digitalAssetService: DigitalAssetService,
    private readonly investService: InvestService,
  ) {}

  @UserAuth()
  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/express-interest')
  async constructExpressInterestTransaction(
    @Query() query: ExpressInterestTransactionParams,
    @UserEntity() user: UserPayload,
  ) {
    const splTokenAddress = query.splTokenAddress ?? SOL_ADDRESS;
    const transaction =
      await this.investService.createExpressInterestTransaction(
        query.walletAddress,
        query.projectSlug,
        user.id,
        splTokenAddress,
      );
    return transaction;
  }

  /* For blink clients to make request for mint transaction */

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Post('/blink/mint/:candyMachine')
  async constructBlinkMintTransaction(
    @Param('couponId') couponId: number,
    @Body() actionPayload: ActionPayloadDto,
  ) {
    const account = publicKey(actionPayload.account);

    const transaction = await this.blinkService.mintComicAction(
      account,
      couponId,
    );

    return toActionResponseDto(transaction.at(-1));
  }

  /* For blink clients to make request for comic sign transaction */
  // @Throttle(STRICT_THROTTLER_CONFIG)
  // @Post('/blink/comic-sign/:address')
  // async constructBlinkComicSignTransaction(
  //   @Param('address') address: string,
  //   @Body() actionPayload: ActionPayloadDto,
  // ) {
  //   const assetAddress = new PublicKey(address);
  //   const publicKey = new PublicKey(actionPayload.account);

  //   const transaction = await this.blinkService.signComicAction(
  //     assetAddress,
  //     publicKey,
  //   );

  //   return toActionResponseDto(transaction);
  // }

  // 500 global requests per second
  @UseInterceptors(GlobalThrottlerInterceptor({ cooldown: 1000, limit: 500 }))
  @Throttle(STRICT_THROTTLER_CONFIG)
  @OptionalUserAuth()
  @Get('/mint')
  async constructMintTransaction(
    @Query() query: MintParams,
    @UserEntity() user?: UserPayload,
  ) {
    const minterAddress = publicKey(query.minterAddress);
    const candyMachineAddress = publicKey(query.candyMachineAddress);
    const { couponId, label } = query;
    const numberOfItems = query.numberOfItems ? +query.numberOfItems : 1;

    const transaction = await this.candyMachineService.createMintTransaction(
      minterAddress,
      candyMachineAddress,
      label,
      couponId,
      numberOfItems,
      user ? user.id : null,
    );
    return [transaction];
  }

  @UseInterceptors(
    MutexInterceptor(MINT_MUTEX_IDENTIFIER, { walletAddress: 'param' }),
  )
  @OptionalUserAuth()
  @Throttle(STRICT_THROTTLER_CONFIG)
  @ApiExcludeEndpoint()
  @Post('/send-mint-transaction/:walletAddress')
  async sendMintTransaction(
    @Param('walletAddress') walletAddress: string,
    @Body() body: SendMintTransactionBodyDto,
    @UserEntity() user?: UserPayload,
  ) {
    return await this.candyMachineService.validateAndSendMintTransaction(
      body.transactions,
      walletAddress,
      user ? user.id : null,
    );
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
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

  @UserAuth()
  @Throttle(STRICT_THROTTLER_CONFIG)
  @Patch('/use-comic-issue-asset')
  async constructUseComicAssetTransaction(
    @Query() query: UseComicParams,
    @UserEntity() user: UserPayload,
  ) {
    return await this.transactionService.unwrapComic(
      query.assetAddress,
      user.id,
    );
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/init-edition-sale')
  async constructInitializeEditionSaleTransaction(
    @Query() initializeEditionSaleParams: InitializePrintEditionSaleParams,
  ) {
    const splTokenAddress =
      initializeEditionSaleParams.splTokenAddress || SOL_ADDRESS;
    return this.auctionHouseService.initializePrintEditionSale({
      ...initializeEditionSaleParams,
      splTokenAddress,
    });
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/buy-print-edition')
  async constructBuyPrintEditionTransaction(
    @Query() buyPrintEditionParams: BuyPrintEditionParams,
  ) {
    return this.auctionHouseService.buyPrintEdition(buyPrintEditionParams);
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/list')
  async constructListTransaction(@Query() listParams: ListParams) {
    return await this.auctionHouseService.list(listParams);
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/timed-auction-list')
  async constructTimedAuctionListTransaction(
    @Query() timedAuctionListParams: TimedAuctionListParams,
  ) {
    return await this.auctionHouseService.timedAuctionList(
      timedAuctionListParams,
    );
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/reprice')
  async constructRepriceListingTransaction(
    @Query() repriceListingParams: RepriceListingParams,
  ) {
    return await this.auctionHouseService.repriceListing(repriceListingParams);
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/bid')
  async constructBidTransaction(@Query() bidParams: BidParams) {
    return await this.auctionHouseService.bid(bidParams);
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/direct-buy')
  @ApiQuery({
    name: 'query',
    type: MultipleBuyParams,
  })
  async constructDirectBuyTransaction(
    @SilentQuery() multipleBuyParams: MultipleBuyParams,
  ) {
    const params = validateAndFormatParams(
      multipleBuyParams.instantBuyParamsArray,
    );
    return await this.auctionHouseService.multipleBuys(params);
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/cancel-bid/:bidId')
  async constructCancelBidTransaction(@Param('bidId') bidId: string) {
    return await this.auctionHouseService.cancelBid(+bidId);
  }

  @Throttle(STRICT_THROTTLER_CONFIG)
  @Get('/cancel-listing/:listingId')
  async createCancelListingTransaction(@Param('listingId') listingId: string) {
    return await this.auctionHouseService.cancelListing(+listingId);
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Throttle(STRICT_THROTTLER_CONFIG)
  @Post('mint/print-edition-collection')
  async createPrintEditionCollectionTransaction(
    @ApiFilesWithBody({
      fileFields: ['image'],
      fileType: BaseMetadataFilesDto,
      bodyType: CreatePrintEditionCollectionBodyDto,
    })
    createPrintEditionCollectionDto: CreatePrintEditionCollectionDto,
  ): Promise<DigitalAssetCreateTransactionDto> {
    return await this.digitalAssetService.createPrintEditionCollectionTransaction(
      createPrintEditionCollectionDto,
    );
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Throttle(STRICT_THROTTLER_CONFIG)
  @Post('mint/one-of-one')
  async createOneOfOneTransaction(
    @ApiFilesWithBody({
      fileFields: ['image'],
      fileType: BaseMetadataFilesDto,
      bodyType: CreateOneOfOneBodyDto,
    })
    createOneOfOneDto: CreateOneOfOneDto,
  ): Promise<DigitalAssetCreateTransactionDto> {
    return await this.digitalAssetService.createOneOfOneTransaction(
      createOneOfOneDto,
    );
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Throttle(STRICT_THROTTLER_CONFIG)
  @Post('mint/one-of-one-collection')
  async createOneOfOneCollectionTransaction(
    @ApiFilesWithBody({
      fileFields: ['image', 'cover'],
      fileType: CreateOneOfOneCollectionFilesDto,
      bodyType: CreateOneOfOneCollectionBodyDto,
    })
    createOneOfOneCollectionDto: CreateOneOfOneCollectionDto,
  ): Promise<DigitalAssetCreateTransactionDto> {
    return await this.digitalAssetService.createOneOfOneCollectionTransaction(
      createOneOfOneCollectionDto,
    );
  }
}
