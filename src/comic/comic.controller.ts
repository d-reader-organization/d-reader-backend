import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ForbiddenException,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Delete,
} from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ComicService } from './comic.service';
import { ComicDto, toComicDto, toComicDtoArray } from './dto/comic.dto';
import { ComicParams } from './dto/comic-params.dto';
import { UserComicService } from './user-comic.service';
import { RateComicDto } from './dto/rate-comic.dto';
import { AdminGuard } from 'src/guards/roles.guard';
import { CreatorPayload, UserPayload } from 'src/auth/dto/authorization.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { ComicOwnerAuth } from 'src/guards/comic-owner.guard';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto, UpdateComicFilesDto } from './dto/update-comic.dto';
import { CreatorAuth } from 'src/guards/creator-auth.guard';
import { RawComicParams } from './dto/raw-comic-params.dto';
import {
  RawComicDto,
  toRawComicDto,
  toRawComicDtoArray,
} from './dto/raw-comic.dto';
import { VerifiedUserAuthGuard } from '../guards/verified-user-auth.guard';
import { CacheInterceptor } from '../cache/cache.interceptor';
import { minutes } from '@nestjs/throttler';
import { SearchComicParams } from './dto/search-comic-params.dto';
import { SearchComicDto, toSearchComicDtoArray } from './dto/search-comic.dto';
import { OptionalUserAuth } from '../guards/optional-user-auth.guard';

@ApiTags('Comic')
@Controller('comic')
export class ComicController {
  constructor(
    private readonly comicService: ComicService,
    private readonly userComicService: UserComicService,
  ) {}

  /* Create a new comic */
  @CreatorAuth()
  @Post('create')
  async create(
    @CreatorEntity() creator: CreatorPayload,
    @Body() createComicDto: CreateComicDto,
  ): Promise<ComicDto> {
    const comic = await this.comicService.create(creator.id, createComicDto);

    return toComicDto(comic);
  }

  /* Get all comics */
  @UseInterceptors(CacheInterceptor({ ttl: minutes(10) }))
  @Get('get')
  async findAll(@Query() query: ComicParams): Promise<ComicDto[]> {
    const comics = await this.comicService.findAll(query);
    return toComicDtoArray(comics);
  }

  /* Get all comics in raw format */
  // @CreatorAuth()
  @Get('get-raw')
  async findAllRaw(@Query() query: RawComicParams): Promise<RawComicDto[]> {
    const comics = await this.comicService.findAllRaw(query);
    return toRawComicDtoArray(comics);
  }

  /* Search all comics */
  @Get('search')
  async searchAll(
    @Query() query: SearchComicParams,
  ): Promise<SearchComicDto[]> {
    const comics = await this.comicService.searchAll(query);
    return toSearchComicDtoArray(comics);
  }

  /* Get specific comic by unique slug */
  @OptionalUserAuth()
  @Get('get/:slug')
  async findOne(
    @Param('slug') slug: string,
    @UserEntity() user?: UserPayload,
  ): Promise<ComicDto> {
    const comic = await this.comicService.findOne(slug, user?.id);
    return toComicDto(comic);
  }

  /* Get specific comic in raw format by unique slug */
  @CreatorAuth()
  @Get('get-raw/:slug')
  async findOneRaw(@Param('slug') slug: string): Promise<RawComicDto> {
    const comic = await this.comicService.findOneRaw(slug);
    return toRawComicDto(comic);
  }

  @Get('get/by-owner/:userId')
  async findOwnedComics(
    @Param('userId') userId: string,
    @Query() query: ComicParams,
  ): Promise<ComicDto[]> {
    const comics = await this.comicService.findAllByOwner(query, +userId);
    return toComicDtoArray(comics);
  }

  @Get('get/favorites/:userId')
  async findFavoriteComics(
    @Param('userId') userId: string,
    @Query() query: ComicParams,
  ): Promise<ComicDto[]> {
    const comics = await this.comicService.findFavorites({
      query,
      userId: +userId,
    });
    return toComicDtoArray(comics);
  }

  /* Update specific comic */
  @ComicOwnerAuth()
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateComicDto: UpdateComicDto,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.update(slug, updateComicDto);
    return toComicDto(updatedComic);
  }

  /* Update specific comic's files */
  @ComicOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Patch('update/:slug/files')
  async updateFiles(
    @Param('slug') slug: string,
    @UploadedFiles({
      transform: (val) => plainToInstance(UpdateComicFilesDto, val),
    })
    files: UpdateComicFilesDto,
  ): Promise<ComicDto> {
    const comic = await this.comicService.updateFiles(slug, files);
    return toComicDto(comic);
  }

  /* Update specific comics cover file */
  @ComicOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('cover')
  @UseInterceptors(FileInterceptor('cover'))
  @Patch('update/:slug/cover')
  async updateCover(
    @Param('slug') slug: string,
    @UploadedFile() cover: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(
      slug,
      cover,
      'cover',
    );
    return toComicDto(updatedComic);
  }

  /* Update specific comics banner file */
  @ComicOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('banner')
  @UseInterceptors(FileInterceptor('banner'))
  @Patch('update/:slug/banner')
  async updateBanner(
    @Param('slug') slug: string,
    @UploadedFile() banner: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(
      slug,
      banner,
      'banner',
    );
    return toComicDto(updatedComic);
  }

  /* Update specific comics logo file */
  @ComicOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('logo')
  @UseInterceptors(FileInterceptor('logo'))
  @Patch('update/:slug/logo')
  async updateLogo(
    @Param('slug') slug: string,
    @UploadedFile() logo: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, logo, 'logo');
    return toComicDto(updatedComic);
  }

  /* Rate specific comic */
  @VerifiedUserAuthGuard()
  @Patch('rate/:slug')
  async rate(
    @Param('slug') slug: string,
    @Body() rateComicDto: RateComicDto,
    @UserEntity() user: UserPayload,
  ) {
    await this.userComicService.rate(user.id, slug, rateComicDto.rating);
  }

  /* Subscribe/unsubscribe from specific comic */
  // @UserAuth()
  // @Patch('subscribe/:slug')
  // async subscribe(
  //   @Param('slug') slug: string,
  //   @UserEntity() user: UserPayload,
  // ) {
  //   await this.userComicService.toggleDate(user.id, slug, 'subscribedAt');
  // }

  /* Bookmark/unbookmark a specific comic */
  @UserAuth()
  @Patch('bookmark/:slug')
  async bookmark(@Param('slug') slug: string, @UserEntity() user: UserPayload) {
    await this.userComicService.toggleDate(user.id, slug, 'bookmarkedAt');
  }

  /* Favouritise/unfavouritise a specific comic */
  @UserAuth()
  @Patch('favouritise/:slug')
  async favouritise(
    @Param('slug') slug: string,
    @UserEntity() user: UserPayload,
  ) {
    await this.userComicService.toggleDate(user.id, slug, 'favouritedAt');
  }

  /* Publish comic */
  @AdminGuard()
  @Patch('publish/:slug')
  async publish(@Param('slug') slug: string) {
    await this.comicService.publish(slug);
  }

  /* Unpublish comic */
  @AdminGuard()
  @Patch('unpublish/:slug')
  async unpublish(@Param('slug') slug: string) {
    throw new ForbiddenException(`Endpoint disabled, cannot unpublish ${slug}`);
    // await this.comicService.unpublish(slug);
  }

  /* Delete comic */
  @ComicOwnerAuth()
  @Delete('delete/:slug')
  async delete(@Param('slug') slug: string) {
    await this.comicService.delete(slug);
  }

  @AdminGuard()
  @Get('download-assets/:slug')
  async downloadAssets(@Param('slug') slug: string) {
    return await this.comicService.dowloadAssets(slug);
  }
}
