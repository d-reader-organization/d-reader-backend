import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from '../types/update-user.dto';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { toUserDto, toUserDtoArray, UserDto } from './dto/user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdatePasswordDto } from 'src/types/update-password.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { memoizeThrottle } from 'src/utils/lodash';
import {
  WalletAssetDto,
  toWalletAssetDtoArray,
} from '../wallet/dto/wallet-asset.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserOwnerAuth } from 'src/guards/user-owner.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { WalletDto, toWalletDtoArray } from 'src/wallet/dto/wallet.dto';
import { AdminGuard } from 'src/guards/roles.guard';
import { UserFilterParams } from './dto/user-params.dto';

@UseGuards(ThrottlerGuard)
@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /* Get user data from auth token */
  @UserAuth()
  @Get('get/me')
  async findMe(@UserEntity() user: UserPayload): Promise<UserDto> {
    const me = await this.userService.findMe(user.id);
    return toUserDto(me);
  }

  /* Get all users */
  @AdminGuard()
  @Get('get')
  async findAll(@Query() query: UserFilterParams): Promise<UserDto[]> {
    const users = await this.userService.findAll(query);
    return toUserDtoArray(users);
  }

  /* Get specific user unique id */
  @AdminGuard()
  @Get('get/:id')
  async findOne(@Param('id') id: string): Promise<UserDto> {
    const user = await this.userService.findOne(+id);
    return toUserDto(user);
  }

  /* Get all NFTs owned by the user */
  @Get('get/:id/assets')
  async getAssets(@Param('id') id: string): Promise<WalletAssetDto[]> {
    const assets = await this.userService.getAssets(+id);
    return toWalletAssetDtoArray(assets);
  }

  /* Get all wallets connected to the user */
  @Get('get/:id/wallets')
  async getWallets(@Param('id') id: string): Promise<WalletDto[]> {
    const wallets = await this.userService.getWallets(+id);
    return toWalletDtoArray(wallets);
  }

  /* Update specific user */
  @UserOwnerAuth()
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDto> {
    const user = await this.userService.update(+id, updateUserDto);
    return toUserDto(user);
  }

  /* Update specific user's password */
  @UserOwnerAuth()
  @Patch('update-password/:id')
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    await this.userService.updatePassword(+id, updatePasswordDto);
  }

  // TODO: this should work similar to verify-email
  // it should send an auth token in an email (as a magic link)
  // which user could visit in order to reset/update their password
  /* Reset specific user's password */
  @UserOwnerAuth()
  @Patch('reset-password/:id')
  async resetPassword(@Param('id') id: string) {
    await this.userService.resetPassword(+id);
  }

  /* Verify your email address */
  @UserOwnerAuth()
  @Patch('request-email-verification')
  async requestEmailVerification(@UserEntity() user: UserPayload) {
    await this.userService.requestEmailVerification(user.email);
  }

  /* Verify an email address */
  @Patch('verify-email/:verificationToken')
  async verifyEmail(
    @Param('verificationToken') verificationToken: string,
  ): Promise<UserDto> {
    const user = await this.userService.verifyEmail(verificationToken);
    return toUserDto(user);
  }

  /* Update specific user's avatar file */
  @UserOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch('update/:id/avatar')
  async updateAvatar(
    @Param('id') id: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<UserDto> {
    const updatedUser = await this.userService.updateFile(
      +id,
      avatar,
      'avatar',
    );
    return toUserDto(updatedUser);
  }

  /* Redeem a referral by user name, email, or id */
  @UserOwnerAuth()
  @Patch('redeem-referral/:referrer')
  async redeemReferral(
    @Param('referrer') referrer: string,
    @UserEntity() user: UserPayload,
  ) {
    const updatedUser = await this.userService.redeemReferral(
      referrer,
      user.id,
    );
    return toUserDto(updatedUser);
  }

  private throttledSyncWallets = memoizeThrottle(
    (id: number) => this.userService.syncWallets(id),
    5 * 60 * 1000, // 5 minutes
  );

  @UserOwnerAuth()
  @Throttle(10, 60)
  @Get('sync-wallets/:id')
  syncWallet(@Param('id') id: string) {
    return this.throttledSyncWallets(+id);
  }

  /* Pseudo delete genre */
  @UserOwnerAuth()
  @Patch('delete/:id')
  async pseudoDelete(@Param('id') id: string) {
    await this.userService.pseudoDelete(+id);
  }

  /* Recover genre */
  @UserOwnerAuth()
  @Patch('recover/:id')
  async pseudoRecover(@Param('id') id: string) {
    await this.userService.pseudoRecover(+id);
  }
}
