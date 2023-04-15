import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import {
  CreateComicSwaggerDto,
  CreateComicDto,
  CreateComicFilesDto,
} from 'src/comic/dto/create-comic.dto';
import { UpdateComicDto } from 'src/comic/dto/update-comic.dto';
import { ComicService } from './comic.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ComicDto, toComicDto, toComicDtoArray } from './dto/comic.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { ComicUpdateGuard } from 'src/guards/comic-update.guard';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { ComicFilterParams } from './dto/comic-filter-params.dto';
import { WalletComicService } from './wallet-comic.service';
import { Creator, Wallet, Role } from '@prisma/client';
import { RateComicDto } from './dto/rate-comic.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles, RolesGuard } from 'src/guards/roles.guard';

@UseGuards(RestAuthGuard, RolesGuard, ComicUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic')
@Controller('comic')
export class ComicController {
  constructor(
    private readonly comicService: ComicService,
    private readonly walletComicService: WalletComicService,
  ) {}

  /* Create a new comic */
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateComicSwaggerDto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'pfp', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Post('create')
  async create(
    @CreatorEntity() creator: Creator,
    @Body() createComicDto: CreateComicDto,
    @UploadedFiles({
      transform: (val) => plainToInstance(CreateComicFilesDto, val),
    })
    files: CreateComicFilesDto,
  ): Promise<ComicDto> {
    const comic = await this.comicService.create(
      creator.id,
      createComicDto,
      files,
    );

    return await toComicDto(comic);
  }

  /* Get all comics */
  @Get('get')
  async findAll(
    @WalletEntity() wallet: Wallet,
    @Query() query: ComicFilterParams,
  ): Promise<ComicDto[]> {
    const comics = await this.comicService.findAll(query, wallet.address);
    return await toComicDtoArray(comics);
  }

  /* Get specific comic by unique slug */
  @Get('get/:slug')
  async findOne(
    @Param('slug') slug: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicDto> {
    const comic = await this.comicService.findOne(slug, wallet.address);
    return await toComicDto(comic);
  }

  /* Update specific comic */
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateComicDto: UpdateComicDto,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.update(slug, updateComicDto);
    return await toComicDto(updatedComic);
  }

  /* Update specific comics cover file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('cover')
  @UseInterceptors(FileInterceptor('cover'))
  @Patch('update/:slug/cover')
  async updateCover(
    @Param('slug') slug: string,
    @UploadedFile() cover: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, cover);
    return await toComicDto(updatedComic);
  }

  /* Update specific comics banner file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('banner')
  @UseInterceptors(FileInterceptor('banner'))
  @Patch('update/:slug/banner')
  async updateBanner(
    @Param('slug') slug: string,
    @UploadedFile() banner: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, banner);
    return await toComicDto(updatedComic);
  }

  /* Update specific comics pfp file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('pfp')
  @UseInterceptors(FileInterceptor('pfp'))
  @Patch('update/:slug/pfp')
  async updatePfp(
    @Param('slug') slug: string,
    @UploadedFile() pfp: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, pfp);
    return await toComicDto(updatedComic);
  }

  /* Update specific comics logo file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('logo')
  @UseInterceptors(FileInterceptor('logo'))
  @Patch('update/:slug/logo')
  async updateLogo(
    @Param('slug') slug: string,
    @UploadedFile() logo: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, logo);
    return await toComicDto(updatedComic);
  }

  /* Rate specific comic */
  @Patch('rate/:slug')
  async rate(
    @Param('slug') slug: string,
    @Body() rateComicDto: RateComicDto,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicDto> {
    await this.walletComicService.rate(
      wallet.address,
      slug,
      rateComicDto.rating,
    );
    return await this.findOne(slug, wallet);
  }

  /* Subscribe/unsubscribe from specific comic */
  @Patch('subscribe/:slug')
  async subscribe(
    @Param('slug') slug: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicDto> {
    await this.walletComicService.toggleState(
      wallet.address,
      slug,
      'isSubscribed',
    );
    return await this.findOne(slug, wallet);
  }

  /* Favouritise/unfavouritise a specific comic */
  @Patch('favouritise/:slug')
  async favouritise(
    @Param('slug') slug: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicDto> {
    await this.walletComicService.toggleState(
      wallet.address,
      slug,
      'isFavourite',
    );
    return await this.findOne(slug, wallet);
  }

  /* Publish comic */
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('publish/:slug')
  async publish(@Param('slug') slug: string): Promise<ComicDto> {
    const publishedComic = await this.comicService.publish(slug);
    return await toComicDto(publishedComic);
  }

  /* Unpublish comic */
  @Patch('unpublish/:slug')
  async unpublish(@Param('slug') slug: string): Promise<ComicDto> {
    throw new ForbiddenException(`Endpoint disabled, cannot unpublish ${slug}`);
    // const unpublishedComic = await this.comicService.unpublish(slug);
    // return await toComicDto(unpublishedComic);
  }

  /* Queue comic for deletion */
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<ComicDto> {
    const deletedComic = await this.comicService.pseudoDelete(slug);
    return await toComicDto(deletedComic);
  }

  /* Remove comic for deletion queue */
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<ComicDto> {
    const recoveredComic = await this.comicService.pseudoRecover(slug);
    return await toComicDto(recoveredComic);
  }

  /* Completely remove specific comic, including files from s3 bucket */
  @Delete('remove/:slug')
  remove(@Param('slug') slug: string) {
    return this.comicService.remove(slug);
  }

  /**
   * TODO v2:
   * - finish email services
   * - comicPages @ApiBody
   * - move all cron jobs to task.service.ts ?
   * - [main.ts] Config validation: https://wanago.io/2020/08/03/api-nestjs-uploading-public-files-to-amazon-s3/
   * - [password] Simulate message creation: const message = Message.from(signatureBytes);
   * - [auth] bcrypt.hash wallet.nonce
   * - [auth] TokenPayload revision
   */

  /**
   * TODO v3:
   * - [auth] Disconnect function to invalidate a token
   * - [services] Support renaming Creator, Comic, ComicIssue
   * - [config] Turn on "strictNullChecks" in tsconfig.ts
   */
}
