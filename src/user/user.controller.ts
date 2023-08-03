import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { toUserDto, UserDto } from './dto/user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserUpdateGuard } from 'src/guards/user-update.guard';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { memoizeThrottle } from 'src/utils/lodash';
import {
  WalletAssetDto,
  toWalletAssetDtoArray,
} from '../wallet/dto/wallet-asset.dto';

@UseGuards(RestAuthGuard, UserUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /* Verify your email address */
  @Post('request-email-verification')
  async requestEmailVerification(@UserEntity() user: User) {
    this.userService.requestEmailVerification(user.id);
  }

  /* Verify your email address */
  @Post('verify-email/:verificationToken')
  async verifyEmail(@Param('verificationToken') verificationToken: string) {
    this.userService.verifyEmail(verificationToken);
  }

  /* Get user data from auth token */
  @Get('get/me')
  async findMe(@UserEntity() user: User): Promise<UserDto> {
    const me = await this.userService.findMe(user.id);
    return toUserDto(me);
  }

  /* Update specific user */
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDto> {
    const user = await this.userService.update(+id, updateUserDto);
    return toUserDto(user);
  }

  /* Update specific user's password */
  @Patch('update-password/:id')
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<UserDto> {
    const user = await this.userService.updatePassword(+id, updatePasswordDto);
    return toUserDto(user);
  }

  /* Reset specific user's password */
  @Patch('reset-password')
  async resetPassword(@Param('id') id: string): Promise<UserDto> {
    const user = await this.userService.resetPassword(+id);
    return toUserDto(user);
  }

  /* Update specific user's avatar file */
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
  @Patch('redeem-referral/:referrer')
  async redeemReferral(
    @Param('referrer') referrer: string,
    @UserEntity() user: User,
  ) {
    const updatedUser = await this.userService.redeemReferral(
      referrer,
      user.id,
    );
    return toUserDto(updatedUser);
  }

  /* Get all NFTs owned by the user */
  @Get('get/:id/assets')
  async getAssets(@Param('id') id: string): Promise<WalletAssetDto[]> {
    const assets = await this.userService.getAssets(+id);
    return toWalletAssetDtoArray(assets);
  }

  private throttledSyncWallets = memoizeThrottle(
    (id: number) => this.userService.syncWallets(id),
    5 * 60 * 1000, // 5 minutes
  );

  @Throttle(10, 60)
  @Get('sync-wallets/:id')
  syncWallet(@Param('id') id: string) {
    return this.throttledSyncWallets(+id);
  }
}
