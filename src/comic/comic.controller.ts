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
import { ComicDto } from './dto/comic.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic')
@Controller('comic')
export class ComicController {
  constructor(private readonly comicService: ComicService) {}

  /* Create a new comic */
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateComicSwaggerDto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'pfp', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Post('create')
  async create(
    // @CreatorEntity()
    // creator: Creator,
    @Body() createComicDto: CreateComicDto,
    @UploadedFiles() files: CreateComicFilesDto,
  ): Promise<ComicDto> {
    // placeholder creator
    const creator = { id: 1 };
    const comic = await this.comicService.create(
      creator.id,
      createComicDto,
      files,
    );

    return plainToInstance(ComicDto, comic);
  }

  /* Get all comics */
  @Get('get')
  async findAll(): Promise<ComicDto[]> {
    const comics = await this.comicService.findAll();
    return plainToInstance(ComicDto, comics);
  }

  /* Get specific comic by unique slug */
  @Get('get/:slug')
  async findOne(@Param('slug') slug: string): Promise<ComicDto> {
    const comic = await this.comicService.findOne(slug);
    return plainToInstance(ComicDto, comic);
  }

  /* Update specific comic */
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateComicDto: UpdateComicDto,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.update(slug, updateComicDto);
    return plainToInstance(ComicDto, updatedComic);
  }

  /* Update specific comics thumbnail file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @Patch('update/:slug/thumbnail')
  async updateThumbnail(
    @Param('slug') slug: string,
    @UploadedFile() thumbnail: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, thumbnail);
    return plainToInstance(ComicDto, updatedComic);
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
    return plainToInstance(ComicDto, updatedComic);
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
    return plainToInstance(ComicDto, updatedComic);
  }

  /* Publish comic */
  @Patch('publish/:slug')
  async publish(@Param('slug') slug: string): Promise<ComicDto> {
    const publishedComic = await this.comicService.publish(slug);
    return plainToInstance(ComicDto, publishedComic);
  }

  /* Unpublish comic */
  @Patch('unpublish/:slug')
  async unpublish(@Param('slug') slug: string): Promise<ComicDto> {
    const unpublishedComic = await this.comicService.unpublish(slug);
    return plainToInstance(ComicDto, unpublishedComic);
  }

  // TODO v1.1: delete only comic if it's creator is the one from the jwt token
  // @UseGuards(EntityOwnershipGuard)
  // @EntityType(Comic)
  /* Queue comic for deletion */
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<ComicDto> {
    const deletedComic = await this.comicService.pseudoDelete(slug);
    return plainToInstance(ComicDto, deletedComic);
  }

  /* Remove comic for deletion queue */
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<ComicDto> {
    const recoveredComic = await this.comicService.pseudoRecover(slug);
    return plainToInstance(ComicDto, recoveredComic);
  }

  /* Completely remove specific comic, including files from s3 bucket */
  @Delete('remove/:slug')
  remove(@Param('slug') slug: string) {
    return this.comicService.remove(slug);
  }

  // TODO: only update your own wallet, unless superadmin/admin
  // TODO: comicPages @ApiBody
  // TODO: in responses turn keys into presignedURLs
  // TODO: when updating comics, handle new hashlists properly?
  // TODO: rename s3 folders when renaming comics/comics
  // TODO: creator auth
  // TODO: updatePages on comic.service
  // TODO: seed
  // TODO: @deprecated slug -> instead use id
}
