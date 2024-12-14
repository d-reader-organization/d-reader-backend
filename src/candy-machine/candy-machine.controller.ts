import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CandyMachineService } from './candy-machine.service';
import { CandyMachineReceiptParams } from '../candy-machine/dto/candy-machine-receipt-params.dto';
import {
  CandyMachineReceiptDto,
  toCMReceiptDtoArray,
} from '../candy-machine/dto/candy-machine-receipt.dto';
import { toCandyMachineDto } from '../candy-machine/dto/candy-machine.dto';
import { CandyMachineParams } from './dto/candy-machine-params.dto';
import { ApiTags } from '@nestjs/swagger';
import { AddWalletWhiteListDto } from './dto/add-wallet-whitelist.dto';
import { AdminGuard } from '../guards/roles.guard';
import { AddCandyMachineCouponDto } from './dto/add-candy-machine-coupon.dto';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { UserEntity } from '../decorators/user.decorator';
import { UserPayload } from '../auth/dto/authorization.dto';
import { OptionalUserAuth } from '../guards/optional-user-auth.guard';
import { AddUserWhiteListDto } from './dto/add-user-whitelist.dto';
import { AddCandyMachineCouponCurrencySettingDto } from './dto/add-coupon-currency-setting.dto';
import { Pagination } from '../types/pagination.dto';
import { toLaunchpadDtoArray } from './dto/launchpad.dto';

@ApiTags('Candy Machine')
@Controller('candy-machine')
export class CandyMachineController {
  constructor(private readonly candyMachineService: CandyMachineService) {}

  @Get('get/receipts')
  async findReceipts(
    @Query() query: CandyMachineReceiptParams,
  ): Promise<CandyMachineReceiptDto[]> {
    const receipts = await this.candyMachineService.findReceipts(query);
    return await toCMReceiptDtoArray(receipts);
  }

  @OptionalUserAuth()
  @Get('get')
  async findByAddress(
    @Query() query: CandyMachineParams,
    @UserEntity() user?: UserPayload,
  ) {
    const userId = user ? user.id : null;
    const candyMachine = await this.candyMachineService.find(query, userId);
    return toCandyMachineDto(candyMachine);
  }

  @Get('get/launchpads')
  async findLaunchpads(@Query() query: Pagination) {
    const launchpads = await this.candyMachineService.findLaunchpads(query);
    return toLaunchpadDtoArray(launchpads);
  }

  @AdminGuard()
  @Post('whitelist-wallets')
  async whitelistWallets(@Body() addWalletWhiteListDto: AddWalletWhiteListDto) {
    const { couponId, walletWhiteList, collectionAddress } =
      addWalletWhiteListDto;
    await this.candyMachineService.addWhitelistedWalletsToCoupon(
      couponId,
      walletWhiteList,
      collectionAddress,
    );
  }

  @AdminGuard()
  @Post('whitelist-users')
  async whitelistUsers(@Body() addUserWhiteListDto: AddUserWhiteListDto) {
    const { couponId, userWhiteList } = addUserWhiteListDto;
    await this.candyMachineService.addWhitelistedUsersToCoupon(
      couponId,
      userWhiteList,
    );
  }

  @AdminGuard()
  @Post('add-coupon/:candyMachineAddress')
  async addCandyMachineCoupon(
    @Param('candyMachineAddress') candyMachineAddress: string,
    @Body() addCandyMachineCouponDto: AddCandyMachineCouponDto,
  ) {
    const splTokenAddress =
      addCandyMachineCouponDto.splTokenAddress ?? WRAPPED_SOL_MINT.toBase58();

    await this.candyMachineService.addCandyMachineCoupon(candyMachineAddress, {
      ...addCandyMachineCouponDto,
      splTokenAddress,
    });
  }

  @AdminGuard()
  @Post('add-coupon-currency/:couponId')
  async addCandyMachineCouponCurrency(
    @Param('couponId') couponId: number,
    @Body()
    addCandyMachineCouponCurrencySettingDto: AddCandyMachineCouponCurrencySettingDto,
  ) {
    await this.candyMachineService.addCandyMachineCouponCurrency(
      couponId,
      addCandyMachineCouponCurrencySettingDto,
    );
  }
}
