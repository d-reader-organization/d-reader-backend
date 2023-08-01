import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
import { UserEntity } from 'src/decorators/user.decorator';
import { ComicParams } from './dto/comic-params.dto';
import { UserComicService } from './user-comic.service';
import { Creator, User, Role } from '@prisma/client';
import { RateComicDto } from './dto/rate-comic.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { SkipUpdateGuard } from 'src/guards/skip-update-guard';

@UseGuards(RestAuthGuard, RolesGuard, ComicUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic')
@Controller('comic')
export class ComicController {
  constructor(
    private readonly comicService: ComicService,
    private readonly userComicService: UserComicService,
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

    return toComicDto(comic);
  }

  /* Get all comics */
  @Get('get')
  async findAll(@Query() query: ComicParams): Promise<ComicDto[]> {
    const comics = await this.comicService.findAll(query);
    return toComicDtoArray(comics);
  }

  /* Get specific comic by unique slug */
  @Get('get/:slug')
  async findOne(
    @Param('slug') slug: string,
    @UserEntity() user: User,
  ): Promise<ComicDto> {
    const comic = await this.comicService.findOne(slug, user.id);
    return toComicDto(comic);
  }

  @Get('get/by-owner/:address')
  async findOwnedComics(
    @Param('address') address: string,
    @Query() query: ComicParams,
  ): Promise<ComicDto[]> {
    const comics = await this.comicService.findAllByOwner(query, address);
    return toComicDtoArray(comics);
  }

  /* Update specific comic */
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateComicDto: UpdateComicDto,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.update(slug, updateComicDto);
    return toComicDto(updatedComic);
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
    const updatedComic = await this.comicService.updateFile(
      slug,
      cover,
      'cover',
    );
    return toComicDto(updatedComic);
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
    const updatedComic = await this.comicService.updateFile(
      slug,
      banner,
      'banner',
    );
    return toComicDto(updatedComic);
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
    const updatedComic = await this.comicService.updateFile(slug, pfp, 'pfp');
    return toComicDto(updatedComic);
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
    const updatedComic = await this.comicService.updateFile(slug, logo, 'logo');
    return toComicDto(updatedComic);
  }

  /* Rate specific comic */
  @SkipUpdateGuard()
  @Patch('rate/:slug')
  async rate(
    @Param('slug') slug: string,
    @Body() rateComicDto: RateComicDto,
    @UserEntity() user: User,
  ): Promise<ComicDto> {
    await this.userComicService.rate(user.id, slug, rateComicDto.rating);
    return this.findOne(slug, user);
  }

  /* Subscribe/unsubscribe from specific comic */
  @SkipUpdateGuard()
  @Patch('subscribe/:slug')
  async subscribe(
    @Param('slug') slug: string,
    @UserEntity() user: User,
  ): Promise<ComicDto> {
    await this.userComicService.toggleState(user.id, slug, 'isSubscribed');
    return this.findOne(slug, user);
  }

  /* Favouritise/unfavouritise a specific comic */
  @SkipUpdateGuard()
  @Patch('favouritise/:slug')
  async favouritise(
    @Param('slug') slug: string,
    @UserEntity() user: User,
  ): Promise<ComicDto> {
    await this.userComicService.toggleState(user.id, slug, 'isFavourite');
    return this.findOne(slug, user);
  }

  /* Publish comic */
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('publish/:slug')
  async publish(@Param('slug') slug: string): Promise<ComicDto> {
    const publishedComic = await this.comicService.publish(slug);
    return toComicDto(publishedComic);
  }

  /* Unpublish comic */
  @Patch('unpublish/:slug')
  async unpublish(@Param('slug') slug: string): Promise<ComicDto> {
    throw new ForbiddenException(`Endpoint disabled, cannot unpublish ${slug}`);
    // const unpublishedComic = await this.comicService.unpublish(slug);
    // return toComicDto(unpublishedComic);
  }

  /* Queue comic for deletion */
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<ComicDto> {
    const deletedComic = await this.comicService.pseudoDelete(slug);
    return toComicDto(deletedComic);
  }

  /* Remove comic for deletion queue */
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<ComicDto> {
    const recoveredComic = await this.comicService.pseudoRecover(slug);
    return toComicDto(recoveredComic);
  }
}
