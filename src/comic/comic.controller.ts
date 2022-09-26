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
import { ComicIdParam, ComicUpdateGuard } from 'src/guards/comic-update.guard';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { Creator } from '@prisma/client';

@UseGuards(RestAuthGuard, ComicUpdateGuard)
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

    const comicDto = plainToInstance(ComicDto, comic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Get all comics */
  @Get('get')
  async findAll(): Promise<ComicDto[]> {
    const comics = await this.comicService.findAll();
    const comicsDto = plainToInstance(ComicDto, comics);
    return await ComicDto.presignUrls(comicsDto);
  }

  /* Get specific comic by unique slug */
  @Get('get/:slug')
  async findOne(@Param('slug') slug: string): Promise<ComicDto> {
    const comic = await this.comicService.findOne(slug);
    const comicDto = plainToInstance(ComicDto, comic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Update specific comic */
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateComicDto: UpdateComicDto,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.update(slug, updateComicDto);
    const comicDto = plainToInstance(ComicDto, updatedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Update specific comics thumbnail file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug/thumbnail')
  async updateThumbnail(
    @Param('slug') slug: string,
    @UploadedFile() thumbnail: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, thumbnail);
    const comicDto = plainToInstance(ComicDto, updatedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Update specific comics pfp file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('pfp')
  @UseInterceptors(FileInterceptor('pfp'))
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug/pfp')
  async updatePfp(
    @Param('slug') slug: string,
    @UploadedFile() pfp: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, pfp);
    const comicDto = plainToInstance(ComicDto, updatedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Update specific comics logo file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('logo')
  @UseInterceptors(FileInterceptor('logo'))
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug/logo')
  async updateLogo(
    @Param('slug') slug: string,
    @UploadedFile() logo: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, logo);
    const comicDto = plainToInstance(ComicDto, updatedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Publish comic */
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Patch('publish/:slug')
  async publish(@Param('slug') slug: string): Promise<ComicDto> {
    const publishedComic = await this.comicService.publish(slug);
    const comicDto = plainToInstance(ComicDto, publishedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Unpublish comic */
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Patch('unpublish/:slug')
  async unpublish(@Param('slug') slug: string): Promise<ComicDto> {
    const unpublishedComic = await this.comicService.unpublish(slug);
    const comicDto = plainToInstance(ComicDto, unpublishedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Queue comic for deletion */
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<ComicDto> {
    const deletedComic = await this.comicService.pseudoDelete(slug);
    const comicDto = plainToInstance(ComicDto, deletedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Remove comic for deletion queue */
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<ComicDto> {
    const recoveredComic = await this.comicService.pseudoRecover(slug);
    const comicDto = plainToInstance(ComicDto, recoveredComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Completely remove specific comic, including files from s3 bucket */
  @ComicIdParam({ key: 'slug', type: 'string' })
  @Delete('remove/:slug')
  remove(@Param('slug') slug: string) {
    return this.comicService.remove(slug);
  }

  // TODO: wallet.comic.id cannot read property from undefined ?
  // TODO: seed
  // FRONTEND

  // TODO: comicPages @ApiBody
  // TODO: updatePages on comicIssue.service, comic-page.service.ts
  // TODO: @deprecated slug -> instead use id
  // TODO: when updating comics, handle new hashlists properly?

  /**
   * TODO v1.2:
   * - [main.ts] API rate limiting: https://docs.nestjs.com/security/rate-limiting
   * - [main.ts] Config validation: https://wanago.io/2020/08/03/api-nestjs-uploading-public-files-to-amazon-s3/
   * - [password] Simulate message creation: const message = Message.from(signatureBytes);
   * - [nft.dto.ts] Decorate 'mint' property with @IsHash()?
   */

  /**
   * TODO v2:
   * - [s3] Move s3client.ts to s3.service.ts
   * - [auth] bcrypt.hash wallet.nonce
   * - [auth] TokenPayload revision
   */

  /**
   * TODO v3:
   * - [auth] Disconnect function to invalidate a token
   * - [services] Support renaming Creator, Comic, ComicIssue
   * - [services] Support changing Comic Issues comicId?
   */
}
