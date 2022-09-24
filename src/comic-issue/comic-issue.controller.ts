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
import { ComicIssueService } from './comic-issue.service';
import {
  CreateComicIssueSwaggerDto,
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
} from './dto/create-comic-issue.dto';
import { UpdateComicIssueDto } from './dto/update-comic-issue.dto';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ComicIssueDto } from './dto/comic-issue.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic Issue')
@Controller('comic-issue')
export class ComicIssueController {
  constructor(private readonly comicIssueService: ComicIssueService) {}

  // https://github.com/swagger-api/swagger-ui/issues/7625
  /* Create a new comic issue */
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateComicIssueSwaggerDto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'soundtrack', maxCount: 1 },
      // { name: 'pages', maxCount: 1 },
    ]),
  )
  @Post('create')
  async create(
    @Body() createComicIssueDto: CreateComicIssueDto,
    @UploadedFiles({
      transform: (val) => plainToInstance(CreateComicIssueFilesDto, val),
    })
    files: CreateComicIssueFilesDto,
  ): Promise<ComicIssueDto> {
    // TODO!: Check if creator.id matches comicIssue.comic.creator.id
    const comicIssue = await this.comicIssueService.create(
      createComicIssueDto,
      files,
    );

    const comicIssueDto = plainToInstance(ComicIssueDto, comicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Get all comic issues */
  @Get('get')
  async findAll(): Promise<ComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAll();
    const comicIssuesDto = plainToInstance(ComicIssueDto, comicIssues);
    return ComicIssueDto.presignUrls(comicIssuesDto);
  }

  /* Get specific comic issue by unique slug */
  @Get('get/:slug')
  async findOne(@Param('slug') slug: string): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.findOne(slug);
    const comicIssueDto = plainToInstance(ComicIssueDto, comicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Update specific comic issue */
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateComicIssueDto: UpdateComicIssueDto,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.update(
      slug,
      updateComicIssueDto,
    );
    const comicIssueDto = plainToInstance(ComicIssueDto, updatedComicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Update specific comic issues cover file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('cover')
  @UseInterceptors(FileInterceptor('cover'))
  @Patch('update/:slug/cover')
  async updateCover(
    @Param('slug') slug: string,
    @UploadedFile() cover: Express.Multer.File,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.updateFile(
      slug,
      cover,
    );
    const comicIssueDto = plainToInstance(ComicIssueDto, updatedComicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Update specific comic issues soundtrack file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('soundtrack')
  @UseInterceptors(FileInterceptor('soundtrack'))
  @Patch('update/:slug/soundtrack')
  async updateSoundtrack(
    @Param('slug') slug: string,
    @UploadedFile() soundtrack: Express.Multer.File,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.updateFile(
      slug,
      soundtrack,
    );
    const comicIssueDto = plainToInstance(ComicIssueDto, updatedComicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Publish comic issue */
  @Patch('publish/:slug')
  async publish(@Param('slug') slug: string): Promise<ComicIssueDto> {
    const publishedComicIssue = await this.comicIssueService.publish(slug);
    const comicIssueDto = plainToInstance(ComicIssueDto, publishedComicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Unpublish comic issue */
  @Patch('unpublish/:slug')
  async unpublish(@Param('slug') slug: string): Promise<ComicIssueDto> {
    const unpublishedComicIssue = await this.comicIssueService.unpublish(slug);
    const comicIssueDto = plainToInstance(ComicIssueDto, unpublishedComicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Queue comic issue for deletion */
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<ComicIssueDto> {
    const deletedComicIssue = await this.comicIssueService.pseudoDelete(slug);
    const comicIssueDto = plainToInstance(ComicIssueDto, deletedComicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Remove comic issue for deletion queue */
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<ComicIssueDto> {
    const recoveredComicIssue = await this.comicIssueService.pseudoRecover(
      slug,
    );
    const comicIssueDto = plainToInstance(ComicIssueDto, recoveredComicIssue);
    return ComicIssueDto.presignUrls(comicIssueDto);
  }

  /* Completely remove specific comic issue, including files from s3 bucket */
  @Delete('remove/:slug')
  remove(@Param('slug') slug: string) {
    return this.comicIssueService.remove(slug);
  }
}
