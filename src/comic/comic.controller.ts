import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ForbiddenException,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ComicService } from './comic.service';
import { ComicDto, toComicDto, toComicDtoArray } from './dto/comic.dto';
import { ComicParams } from './dto/comic-params.dto';
import { UserComicService } from './user-comic.service';
import { RateComicDto } from './dto/rate-comic.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
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
import {
  CreateComicDto,
  CreateComicBodyDto,
  CreateComicFilesDto,
} from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { CreatorAuth } from 'src/guards/creator-auth.guard';

@UseGuards(ThrottlerGuard)
@ApiTags('Comic')
@Controller('comic')
export class ComicController {
  constructor(
    private readonly comicService: ComicService,
    private readonly userComicService: UserComicService,
  ) {}

  /* Create a new comic */
  @CreatorAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateComicDto })
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
    @CreatorEntity() creator: CreatorPayload,
    @Body() createComicDto: CreateComicBodyDto,
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
  @UserAuth()
  @Get('get/:slug')
  async findOne(
    @Param('slug') slug: string,
    @UserEntity() user: UserPayload,
  ): Promise<ComicDto> {
    const comic = await this.comicService.findOne(slug, user.id);
    return toComicDto(comic);
  }

  // TODO v2: this can be moved to the 'comic/get' endpoint?
  @Get('get/by-owner/:userId')
  async findOwnedComics(
    @Param('userId') userId: string,
    @Query() query: ComicParams,
  ): Promise<ComicDto[]> {
    const comics = await this.comicService.findAllByOwner(query, +userId);
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

  /* Update specific comics pfp file */
  @ComicOwnerAuth()
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
  @UserAuth()
  @Patch('rate/:slug')
  async rate(
    @Param('slug') slug: string,
    @Body() rateComicDto: RateComicDto,
    @UserEntity() user: UserPayload,
  ) {
    await this.userComicService.rate(user.id, slug, rateComicDto.rating);
  }

  /* Subscribe/unsubscribe from specific comic */
  @UserAuth()
  @Patch('subscribe/:slug')
  async subscribe(
    @Param('slug') slug: string,
    @UserEntity() user: UserPayload,
  ) {
    await this.userComicService.toggleState(user.id, slug, 'isSubscribed');
  }

  /* Favouritise/unfavouritise a specific comic */
  @UserAuth()
  @Patch('favouritise/:slug')
  async favouritise(
    @Param('slug') slug: string,
    @UserEntity() user: UserPayload,
  ) {
    await this.userComicService.toggleState(user.id, slug, 'isFavourite');
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

  /* Queue comic for deletion */
  @ComicOwnerAuth()
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string) {
    await this.comicService.pseudoDelete(slug);
  }

  /* Remove comic for deletion queue */
  @ComicOwnerAuth()
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string) {
    await this.comicService.pseudoRecover(slug);
  }
}
