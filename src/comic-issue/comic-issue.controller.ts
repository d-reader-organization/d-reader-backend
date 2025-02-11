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
import { ComicIssueService } from './comic-issue.service';
import {
  ComicIssueDto,
  toComicIssueDto,
  toComicIssueDtoArray,
} from './dto/comic-issue.dto';
import { ComicIssueParams } from './dto/comic-issue-params.dto';
import { UserComicIssueService } from './user-comic-issue.service';
import { RateComicDto } from 'src/comic/dto/rate-comic.dto';
import {
  ComicPageDto,
  toComicPageDtoArray,
} from '../comic-page/entities/comic-page.dto';
import { PublishOnChainDto } from './dto/publish-on-chain.dto';
import { AdminGuard } from 'src/guards/roles.guard';
import {
  OwnedComicIssueDto,
  toOwnedComicIssueDtoArray,
} from './dto/owned-comic-issue.dto';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import {
  CreateComicPageBodyDto,
  CreateComicPageFilesDto,
  CreateComicPageDto,
} from 'src/comic-page/dto/create-comic-page.dto';
import { ApiFileArray } from 'src/decorators/api-file-array.decorator';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { ComicIssueOwnerAuth } from 'src/guards/comic-issue-owner.guard';
import {
  CreateStatefulCoverBodyDto,
  CreateStatefulCoverFilesDto,
  CreateStatefulCoverDto,
} from './dto/covers/create-stateful-cover.dto';
import {
  CreateStatelessCoverBodyDto,
  CreateStatelessCoverFilesDto,
  CreateStatelessCoverDto,
} from './dto/covers/create-stateless-cover.dto';
import { CreateComicIssueDto } from './dto/create-comic-issue.dto';
import {
  UpdateComicIssueDto,
  UpdateComicIssueFilesDto,
} from './dto/update-comic-issue.dto';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { CreatorAuth } from 'src/guards/creator-auth.guard';
import {
  RawComicIssueDto,
  toPaginatedRawComicIssueDto,
  toRawComicIssueDto,
} from './dto/raw-comic-issue.dto';
import { RawComicIssueParams } from './dto/raw-comic-issue-params.dto';
import { VerifiedUserAuthGuard } from '../guards/verified-user-auth.guard';
import { processComicIssueIdString } from '../utils/comic-issue';
import { OptionalUserAuth } from '../guards/optional-user-auth.guard';
import { CacheInterceptor } from '../cache/cache.interceptor';
import { minutes } from '@nestjs/throttler';
import {
  SearchComicIssueDto,
  toSearchComicIssuesDtoArray,
} from './dto/search-comic-issue.dto';
import { SearchComicIssueParams } from './dto/search-comic-issue-params.dto';
import { AdminOrCreatorOwner } from 'src/guards/admin-or-creator-owner.guard';
import { PaginatedResponseDto } from 'src/types/paginated-response.dto';

@ApiTags('Comic Issue')
@Controller('comic-issue')
export class ComicIssueController {
  constructor(
    private readonly comicIssueService: ComicIssueService,
    private readonly userComicIssueService: UserComicIssueService,
    private readonly comicPageService: ComicPageService,
  ) {}

  /* Create a new comic issue */
  @CreatorAuth()
  @Post('create')
  async create(
    @UserEntity() creator: UserPayload,
    @Body() createComicIssueDto: CreateComicIssueDto,
  ): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.create(
      creator.id,
      createComicIssueDto,
    );
    return toComicIssueDto(comicIssue);
  }

  /* Get all comic issues */
  @UseInterceptors(CacheInterceptor({ ttl: minutes(10) }))
  @Get('get')
  async findAll(@Query() query: ComicIssueParams): Promise<ComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAll(query);
    return toComicIssueDtoArray(comicIssues);
  }

  /* Get all comics issues in raw format */
  @AdminOrCreatorOwner()
  @Get('get-raw')
  async findAllRaw(
    @Query() query: RawComicIssueParams,
  ): Promise<PaginatedResponseDto<RawComicIssueDto>> {
    const data = await this.comicIssueService.findAllRaw(query);
    return toPaginatedRawComicIssueDto(data);
  }

  @Get('get/by-owner/:userId')
  async findOwnedComicIssues(
    @Param('userId') userId: string,
    @Query() query: ComicIssueParams,
  ): Promise<OwnedComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAllByOwner(
      query,
      +userId,
    );
    return toOwnedComicIssueDtoArray(comicIssues);
  }

  /* Search all comic issues */
  @Get('search')
  async searchAll(
    @Query() query: SearchComicIssueParams,
  ): Promise<SearchComicIssueDto[]> {
    const comics = await this.comicIssueService.searchAll(query);
    return toSearchComicIssuesDtoArray(comics);
  }

  /* Get specific comic issue by unique id or unique collection slug */
  @OptionalUserAuth()
  @Get('get/:id')
  async findOne(
    @Param('id') id: string,
    @UserEntity() user?: UserPayload,
  ): Promise<ComicIssueDto> {
    const processedId = processComicIssueIdString(id);
    const comicIssue = await this.comicIssueService.findOne({
      where: processedId,
      userId: user?.id,
    });
    return toComicIssueDto(comicIssue);
  }

  @UseInterceptors(CacheInterceptor({ ttl: minutes(10) }))
  @Get('get-public/:id')
  async findOnePublic(@Param('id') id: string): Promise<ComicIssueDto> {
    const processedId = processComicIssueIdString(id);
    const comicIssue = await this.comicIssueService.findOnePublic(processedId);
    return toComicIssueDto(comicIssue);
  }

  /* Get specific comic issue in raw format by unique id */
  @ComicIssueOwnerAuth()
  @Get('get-raw/:id')
  async findOneRaw(@Param('id') id: string): Promise<RawComicIssueDto> {
    const comicIssue = await this.comicIssueService.findOneRaw(+id);
    return toRawComicIssueDto(comicIssue);
  }

  /* Get specific comic issue's pages */
  @OptionalUserAuth()
  @Get('get/:id/pages')
  async getPages(
    @Param('id') id: string,
    @UserEntity() user?: UserPayload,
  ): Promise<ComicPageDto[]> {
    const pages = await this.comicIssueService.getPages(+id, user?.id);
    return toComicPageDtoArray(pages);
  }

  /* Update specific comic issue */
  @ComicIssueOwnerAuth()
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateComicIssueDto: UpdateComicIssueDto,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.update(
      +id,
      updateComicIssueDto,
    );
    return toComicIssueDto(updatedComicIssue);
  }

  /* Update specific comic issue's files */
  @ComicIssueOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'pdf', maxCount: 1 }]))
  @Patch('update/:id/files')
  async updateFiles(
    @Param('id') id: string,
    @UploadedFiles({
      transform: (val) => plainToInstance(UpdateComicIssueFilesDto, val),
    })
    files: UpdateComicIssueFilesDto,
  ): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.updateFiles(+id, files);
    return toComicIssueDto(comicIssue);
  }

  /* Update specific comic issues pdf file */
  @ComicIssueOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('pdf')
  @UseInterceptors(FileInterceptor('pdf'))
  @Patch('update/:id/pdf')
  async updatePdf(
    @Param('id') id: string,
    @UploadedFile() pdf: Express.Multer.File,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.updateFile(
      +id,
      pdf,
      'pdf',
    );
    return toComicIssueDto(updatedComicIssue);
  }

  /* Update comic issue pages */
  @ComicIssueOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Post('update/:id/pages')
  async updatePages(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'pages',
      fileField: 'image',
      bodyType: CreateComicPageBodyDto,
      fileType: CreateComicPageFilesDto,
    })
    pagesDto: CreateComicPageDto[],
  ) {
    await this.comicPageService.updateMany(pagesDto, +id);
  }

  /* Update Stateless covers */
  @ComicIssueOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Post('update/:id/stateless-covers')
  async updateStatelessCovers(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'covers',
      fileField: 'image',
      bodyType: CreateStatelessCoverBodyDto,
      fileType: CreateStatelessCoverFilesDto,
    })
    statelessCoverDto: CreateStatelessCoverDto[],
  ) {
    await this.comicIssueService.updateStatelessCovers(statelessCoverDto, +id);
  }

  /* Update Stateful covers */
  @ComicIssueOwnerAuth()
  @Post('update/:id/stateful-covers')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  async updateStatefulCovers(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'covers',
      fileField: 'image',
      bodyType: CreateStatefulCoverBodyDto,
      fileType: CreateStatefulCoverFilesDto,
    })
    statefulCoverDto: [CreateStatefulCoverDto],
  ) {
    await this.comicIssueService.updateStatefulCovers(statefulCoverDto, +id);
  }

  /* Favouritise/unfavouritise a specific comic issue */
  @UserAuth()
  @Patch('favouritise/:id')
  async favouritise(@Param('id') id: string, @UserEntity() user: UserPayload) {
    await this.userComicIssueService.toggleDate(user.id, +id, 'favouritedAt');
  }

  /* Rate specific comic issue */
  @VerifiedUserAuthGuard()
  @Patch('rate/:id')
  async rate(
    @Param('id') id: string,
    @Body() rateComicDto: RateComicDto,
    @UserEntity() user: UserPayload,
  ) {
    await this.userComicIssueService.rate(user.id, +id, rateComicDto.rating);
  }

  /* Read a specific comic issue */
  @UserAuth()
  @Patch('read/:id')
  async read(@Param('id') id: string, @UserEntity() user: UserPayload) {
    await this.comicIssueService.read(+id, user.id);
  }

  /* Publish an off-chain comic issue on chain */
  @AdminGuard()
  @Patch('publish-on-chain/:id')
  async publishOnChain(
    @Param('id') id: string,
    @Body() publishOnChainDto: PublishOnChainDto,
  ) {
    await this.comicIssueService.publishOnChain(+id, publishOnChainDto);
  }

  /* Publish comic issue */
  @AdminGuard()
  @Patch('publish-off-chain/:id')
  async publishOffChain(@Param('id') id: string) {
    await this.comicIssueService.publishOffChain(+id);
  }

  /* Unpublish comic issue */
  @AdminGuard()
  @Patch('unpublish/:id')
  async unpublish(@Param('id') id: string) {
    throw new ForbiddenException(`Endpoint disabled, cannot unpublish ${id}`);
    // await this.comicIssueService.unpublish(+id);
  }

  /* Delete comic issue */
  @ComicIssueOwnerAuth()
  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    await this.comicIssueService.delete(+id);
  }

  @AdminGuard()
  @Get('download-assets/:id')
  async downloadAssets(@Param('id') id: string) {
    return await this.comicIssueService.dowloadAssets(+id);
  }
}
