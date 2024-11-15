import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import {
  UpdateCreatorDto,
  UpdateCreatorFilesDto,
} from 'src/creator/dto/update-creator.dto';
import { CreatorService } from './creator.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { CreatorDto, toCreatorDto, toCreatorDtoArray } from './dto/creator.dto';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { CreatorOwnerAuth } from 'src/guards/creator-owner.guard';
import { CreatorFilterParams } from './dto/creator-params.dto';
import { UserCreatorService } from './user-creator.service';
import { CreatorPayload, UserPayload } from 'src/auth/dto/authorization.dto';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
  UpdatePasswordDto,
} from 'src/types/update-password.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { CreatorAuth } from 'src/guards/creator-auth.guard';
import { plainToInstance } from 'class-transformer';
import { memoizeThrottle } from '../utils/lodash';
import {
  RawCreatorDto,
  toRawCreatorDto,
  toRawCreatorDtoArray,
} from './dto/raw-creator.dto';
import { RawCreatorFilterParams } from './dto/raw-creator-params.dto';
import { AdminGuard } from 'src/guards/roles.guard';

@ApiTags('Creator')
@Controller('creator')
export class CreatorController {
  constructor(
    private readonly creatorService: CreatorService,
    private readonly userCreatorService: UserCreatorService,
  ) {}

  /* Get creator data from auth token */
  @CreatorAuth()
  @Get('get/me')
  async findMe(@CreatorEntity() creator: UserPayload): Promise<CreatorDto> {
    const me = await this.creatorService.findMe(creator.id);
    return toCreatorDto(me);
  }

  /* Get all creators */
  @Get('get')
  async findAll(@Query() query: CreatorFilterParams): Promise<CreatorDto[]> {
    const creators = await this.creatorService.findAll(query);
    return toCreatorDtoArray(creators);
  }

  /* Get specific creator by unique slug */
  @UserAuth()
  @Get('get/:slug')
  async findOne(
    @UserEntity() user: UserPayload,
    @Param('slug') slug: string,
  ): Promise<CreatorDto> {
    const creator = await this.creatorService.findOne(slug, user.id);
    return toCreatorDto(creator);
  }

  /* Get all creator in raw format*/
  @CreatorAuth()
  @Get('get-raw')
  async findAllRaw(
    @Query() query: RawCreatorFilterParams,
  ): Promise<RawCreatorDto[]> {
    const creator = await this.creatorService.findAllRaw(query);
    return toRawCreatorDtoArray(creator);
  }

  /* Get specific creator in raw format by unique slug */
  @CreatorAuth()
  @Get('get-raw/:slug')
  async findOneRaw(@Param('slug') slug: string): Promise<RawCreatorDto> {
    const creator = await this.creatorService.findOneRaw(slug);
    return toRawCreatorDto(creator);
  }

  @Get('get/followed-by-user/:userId')
  async findFollowedByUser(
    @Param('userId') userId: string,
    @Query() query: CreatorFilterParams,
  ) {
    const creators = await this.userCreatorService.getCreatorsFollowedByUser({
      query,
      userId: +userId,
    });
    return toCreatorDtoArray(creators);
  }

  /* Update specific creator */
  @CreatorOwnerAuth()
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateCreatorDto: UpdateCreatorDto,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.update(
      slug,
      updateCreatorDto,
    );
    return toCreatorDto(updatedCreator);
  }

  /* Update specific creator's password */
  @CreatorOwnerAuth()
  @Patch('update-password/:slug')
  async updatePassword(
    @Param('slug') slug: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    await this.creatorService.updatePassword(slug, updatePasswordDto);
  }

  private throttledRequestPasswordReset = memoizeThrottle(
    (email: string) => {
      return this.creatorService.requestPasswordReset(email);
    },
    3 * 60 * 1000, // cache for 3 minutes
  );

  @Patch('request-password-reset')
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ) {
    return this.throttledRequestPasswordReset(
      requestPasswordResetDto.nameOrEmail,
    );
  }

  /* Reset specific creator's password */
  @Patch('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.creatorService.resetPassword(resetPasswordDto);
  }

  private throttledRequestEmailVerification = memoizeThrottle(
    (email: string) => this.creatorService.requestEmailVerification(email),
    2 * 60 * 1000, // cache for 2 minutes
  );

  /* Verify your email address */
  @CreatorOwnerAuth()
  @Patch('request-email-verification')
  async requestEmailVerification(@CreatorEntity() creator: CreatorPayload) {
    return this.throttledRequestEmailVerification(creator.email);
  }

  /* Verify an email address */
  @Patch('verify-email/:verificationToken')
  async verifyEmail(
    @Param('verificationToken') verificationToken: string,
  ): Promise<CreatorDto> {
    const creator = await this.creatorService.verifyEmail(verificationToken);
    return toCreatorDto(creator);
  }

  /* Update specific creator's files */
  @CreatorOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Patch('update/:slug/files')
  async updateFiles(
    @Param('slug') slug: string,
    @UploadedFiles({
      transform: (val) => plainToInstance(UpdateCreatorFilesDto, val),
    })
    files: UpdateCreatorFilesDto,
  ): Promise<CreatorDto> {
    const creator = await this.creatorService.updateFiles(slug, files);
    return toCreatorDto(creator);
  }

  /* Update specific creators avatar file */
  @CreatorOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch('update/:slug/avatar')
  async updateAvatar(
    @Param('slug') slug: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(
      slug,
      avatar,
      'avatar',
    );
    return toCreatorDto(updatedCreator);
  }

  /* Update specific creators banner file */
  @CreatorOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('banner')
  @UseInterceptors(FileInterceptor('banner'))
  @Patch('update/:slug/banner')
  async updateBanner(
    @Param('slug') slug: string,
    @UploadedFile() banner: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(
      slug,
      banner,
      'banner',
    );
    return toCreatorDto(updatedCreator);
  }

  /* Update specific creators logo file */
  @CreatorOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('logo')
  @UseInterceptors(FileInterceptor('logo'))
  @Patch('update/:slug/logo')
  async updateLogo(
    @Param('slug') slug: string,
    @UploadedFile() logo: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(
      slug,
      logo,
      'logo',
    );
    return toCreatorDto(updatedCreator);
  }

  /* Queue creator for deletion */
  @CreatorOwnerAuth()
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string) {
    await this.creatorService.pseudoDelete(slug);
  }

  /* Remove creator for deletion queue */
  @CreatorOwnerAuth()
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string) {
    await this.creatorService.pseudoRecover(slug);
  }

  /* Follow a creator */
  @UserAuth()
  @Patch('follow/:slug')
  async follow(@UserEntity() user: UserPayload, @Param('slug') slug: string) {
    await this.userCreatorService.toggleDate(user.id, slug, 'followedAt');
  }

  @AdminGuard()
  @Get('download-assets/:slug')
  async downloadAssets(@Param('slug') slug: string) {
    return await this.creatorService.dowloadAssets(slug);
  }
}
