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
import {
  ListParams,
  TimedAuctionListParams,
} from '../auction-house/dto/list-params.dto';
import { BidParams } from '../auction-house/dto/bid-params.dto';
import { SilentQuery } from '../decorators/silent-query.decorator';
import { validateAndFormatParams } from '../utils/validate-params';
import { MultipleBuyParams } from '../auction-house/dto/instant-buy-params.dto';
import { ComicStateArgs } from 'dreader-comic-verse';
import { PublicKey, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
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
} from 'src/digital-asset/dto/create-one-of-one-dto';
import {
  CreateOneOfOneCollectionBodyDto,
  CreateOneOfOneCollectionDto,
  CreateOneOfOneCollectionFilesDto,
} from 'src/digital-asset/dto/create-one-of-one-collection-dto';
import { DigitalAssetCreateTransactionDto } from 'src/digital-asset/dto/digital-asset-transaction-dto';
import { publicKey } from '@metaplex-foundation/umi';
import { SendMintTransactionBodyDto } from './dto/send-mint-transaction.dto';
import { MutexInterceptor } from 'src/mutex/mutex.interceptor';
import { MINT_MUTEX_IDENTIFIER, SOL_ADDRESS } from 'src/constants';
import { RepriceListingParams } from 'src/auction-house/dto/reprice-listing-params.dto';
import { InitializePrintEditionSaleParams } from 'src/auction-house/dto/initialize-edition-sale-params.dto';
import { BuyPrintEditionParams } from 'src/auction-house/dto/buy-print-edition-params';

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
    const minterAddress = publicKey(query.minterAddress);
    const candyMachineAddress = publicKey(query.candyMachineAddress);

    return await this.candyMachineService.createMintTransaction(
      minterAddress,
      candyMachineAddress,
      query.label,
      query.couponId,
      1,
      user ? user.id : null,
    );
  }

  /* For blink clients to make request for mint transaction */
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
    const minterAddress = publicKey(query.minterAddress);
    const candyMachineAddress = publicKey(query.candyMachineAddress);
    const { couponId, label } = query;
    const numberOfItems = query.numberOfItems ? +query.numberOfItems : 1;

    return await this.candyMachineService.createMintTransaction(
      minterAddress,
      candyMachineAddress,
      label,
      couponId,
      numberOfItems,
      user ? user.id : null,
    );
  }

  @UseInterceptors(MutexInterceptor(MINT_MUTEX_IDENTIFIER, { id: 'param' }))
  @Post('/send-mint-transaction/:walletAddress')
  async sendMintTransaction(
    @Param('walletAddress') walletAddress: string,
    @Body() body: SendMintTransactionBodyDto,
  ) {
    return await this.candyMachineService.validateAndSendMintTransaction(
      body.transactions,
      walletAddress,
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

  @Get('/buy-print-edition')
  async constructBuyPrintEditionTransaction(
    @Query() buyPrintEditionParams: BuyPrintEditionParams,
  ) {
    return this.auctionHouseService.buyPrintEdition(buyPrintEditionParams);
  }

  @Get('/list')
  async constructListTransaction(@Query() listParams: ListParams) {
    return await this.auctionHouseService.list(listParams);
  }

  @Get('/timed-auction-list')
  async constructTimedAuctionListTransaction(
    @Query() timedAuctionListParams: TimedAuctionListParams,
  ) {
    return await this.auctionHouseService.timedAuctionList(
      timedAuctionListParams,
    );
  }

  @Get('/reprice')
  async constructRepriceListingTransaction(
    @Query() repriceListingParams: RepriceListingParams,
  ) {
    return await this.auctionHouseService.repriceListing(repriceListingParams);
  }

  @Get('/bid')
  async constructBidTransaction(@Query() bidParams: BidParams) {
    return await this.auctionHouseService.bid(bidParams);
  }

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

  @Get('/cancel-bid/:bidId')
  async constructCancelBidTransaction(@Param('bidId') bidId: string) {
    return await this.auctionHouseService.cancelBid(+bidId);
  }

  @Get('/cancel-listing/:listingId')
  async createCancelListingTransaction(@Param('listingId') listingId: string) {
    return await this.auctionHouseService.cancelListing(+listingId);
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
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
