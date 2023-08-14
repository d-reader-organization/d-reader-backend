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
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { UpdateCreatorDto } from 'src/creator/dto/update-creator.dto';
import { CreatorService } from './creator.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreatorDto, toCreatorDto, toCreatorDtoArray } from './dto/creator.dto';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { CreatorOwnerAuth } from 'src/guards/creator-owner.guard';
import { FilterParams } from './dto/creator-params.dto';
import { UserCreatorService } from './user-creator.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreatorPayload, UserPayload } from 'src/auth/dto/authorization.dto';
import { UpdatePasswordDto } from 'src/types/update-password.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { CreatorAuth } from 'src/guards/creator-auth.guard';

@UseGuards(ThrottlerGuard)
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
  async findMe(@UserEntity() creator: UserPayload): Promise<CreatorDto> {
    const me = await this.creatorService.findMe(creator.id);
    return toCreatorDto(me);
  }

  /* Get all creators */
  @Get('get')
  async findAll(@Query() query: FilterParams): Promise<CreatorDto[]> {
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

  /* Reset specific creator's password */
  @CreatorOwnerAuth()
  @Patch('reset-password/:slug')
  async resetPassword(@Param('slug') slug: string) {
    await this.creatorService.resetPassword(slug);
  }

  /* Verify your email address */
  @CreatorOwnerAuth()
  @Patch('request-email-verification')
  async requestEmailVerification(@CreatorEntity() creator: CreatorPayload) {
    await this.creatorService.requestEmailVerification(creator.email);
  }

  /* Verify an email address */
  @Patch('verify-email/:verificationToken')
  async verifyEmail(@Param('verificationToken') verificationToken: string) {
    await this.creatorService.verifyEmail(verificationToken);
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
    await this.userCreatorService.toggleFollow(user.id, slug);
  }
}
