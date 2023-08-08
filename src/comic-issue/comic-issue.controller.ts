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
  Query,
  ForbiddenException,
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
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ComicIssueDto,
  toComicIssueDto,
  toComicIssueDtoArray,
} from './dto/comic-issue.dto';
import { plainToInstance } from 'class-transformer';
import { ComicIssueUpdateGuard } from 'src/guards/comic-issue-update.guard';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { Creator, User, Role } from '@prisma/client';
import { ComicIssueParams } from './dto/comic-issue-params.dto';
import { UserComicIssueService } from './user-comic-issue.service';
import { RateComicDto } from 'src/comic/dto/rate-comic.dto';
import {
  ComicPageDto,
  toComicPageDtoArray,
} from '../comic-page/entities/comic-page.dto';
import { PublishOnChainDto } from './dto/publish-on-chain.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { SkipUpdateGuard } from 'src/guards/skip-update-guard';
import { ApiFileArray } from 'src/decorators/api-file-array.decorator';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
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
import {
  CreateComicPageBodyDto,
  CreateComicPageDto,
  CreateComicPageFilesDto,
} from '../comic-page/dto/create-comic-page.dto';
import { ComicPageService } from '../comic-page/comic-page.service';
import {
  OwnedComicIssueDto,
  toOwnedComicIssueDtoArray,
} from './dto/owned-comic-issue.dto';

@UseGuards(RestAuthGuard, RolesGuard, ComicIssueUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic Issue')
@Controller('comic-issue')
export class ComicIssueController {
  constructor(
    private readonly comicIssueService: ComicIssueService,
    private readonly comicPageService: ComicPageService,
    private readonly userComicIssueService: UserComicIssueService,
  ) {}

  /* Create a new comic issue */
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateComicIssueSwaggerDto })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'cover', maxCount: 1 }]))
  @Post('create')
  async create(
    @CreatorEntity() creator: Creator,
    @Body() createComicIssueDto: CreateComicIssueDto,
    @UploadedFiles({
      transform: (val) => plainToInstance(CreateComicIssueFilesDto, val),
    })
    files: CreateComicIssueFilesDto,
  ): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.create(
      creator.id,
      createComicIssueDto,
      files,
    );

    return toComicIssueDto(comicIssue);
  }

  /* Get all comic issues */
  @Get('get')
  async findAll(@Query() query: ComicIssueParams): Promise<ComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAll(query);
    return toComicIssueDtoArray(comicIssues);
  }

  @Get('get/by-owner/:id')
  async findOwnedComicIssues(
    @Param('id') id: string,
    @Query() query: ComicIssueParams,
  ): Promise<OwnedComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAllByOwner(query, +id);
    return toOwnedComicIssueDtoArray(comicIssues);
  }

  /* Get specific comic issue by unique id */
  @Get('get/:id')
  async findOne(
    @Param('id') id: string,
    @UserEntity() user: User,
  ): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.findOne(+id, user.id);
    return toComicIssueDto(comicIssue);
  }

  /* Get specific comic issue's pages */
  @Get('get/:id/pages')
  async getPages(
    @Param('id') id: string,
    @UserEntity() user: User,
  ): Promise<ComicPageDto[]> {
    const pages = await this.comicIssueService.getPages(+id, user.id);
    return toComicPageDtoArray(pages);
  }

  /* Update specific comic issue */
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

  /* Favouritise/unfavouritise a specific comic issue */
  @SkipUpdateGuard()
  @Patch('favouritise/:id')
  favouritise(@Param('id') id: string, @UserEntity() user: User) {
    this.userComicIssueService.toggleState(user.id, +id, 'isFavourite');
  }

  /* Rate specific comic issue */
  @SkipUpdateGuard()
  @Patch('rate/:id')
  rate(
    @Param('id') id: string,
    @Body() rateComicDto: RateComicDto,
    @UserEntity() user: User,
  ) {
    this.userComicIssueService.rate(user.id, +id, rateComicDto.rating);
  }

  /* Read a specific comic issue */
  @SkipUpdateGuard()
  @Patch('read/:id')
  read(@Param('id') id: string, @UserEntity() user: User) {
    this.comicIssueService.read(+id, user.id);
  }

  /* Update specific comic issues pdf file */
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

  /* Update specific comic issues signature file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('signature')
  @UseInterceptors(FileInterceptor('signature'))
  @Patch('update/:id/signature')
  async updateSignature(
    @Param('id') id: string,
    @UploadedFile() signature: Express.Multer.File,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.updateFile(
      +id,
      signature,
      'signature',
    );
    return toComicIssueDto(updatedComicIssue);
  }

  /* Update comic issue pages */
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Post('update/pages/:id')
  async updatePages(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'data',
      fileField: 'image',
      bodyType: CreateComicPageBodyDto,
      fileType: CreateComicPageFilesDto,
    })
    pagesDto: CreateComicPageDto[],
  ) {
    await this.comicPageService.updateMany(pagesDto, +id);
  }

  /* Update Stateless covers */
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Post('update/stateless-covers/:id')
  async updateStatelessCovers(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'data',
      fileField: 'image',
      bodyType: CreateStatelessCoverBodyDto,
      fileType: CreateStatelessCoverFilesDto,
    })
    statelessCoverDto: CreateStatelessCoverDto[],
  ) {
    await this.comicIssueService.updateStatelessCovers(statelessCoverDto, +id);
  }

  /* Update Stateful covers */
  @Post('update/stateful-covers/:id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  async updateStatefulCovers(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'data',
      fileField: 'image',
      bodyType: CreateStatefulCoverBodyDto,
      fileType: CreateStatefulCoverFilesDto,
    })
    statefulCoverDto: [CreateStatefulCoverDto],
  ) {
    await this.comicIssueService.updateStatefulCovers(statefulCoverDto, +id);
  }

  /* Publish an off-chain comic issue on chain */
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('publish-on-chain/:id')
  async publishOnChain(
    @Param('id') id: string,
    @Body() publishOnChainDto: PublishOnChainDto,
  ): Promise<ComicIssueDto> {
    const publishedComicIssue = await this.comicIssueService.publishOnChain(
      +id,
      publishOnChainDto,
    );
    return toComicIssueDto(publishedComicIssue);
  }

  /* Publish comic issue */
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('publish-off-chain/:id')
  async publishOffChain(@Param('id') id: string): Promise<ComicIssueDto> {
    const publishedComicIssue = await this.comicIssueService.publishOffChain(
      +id,
    );
    return toComicIssueDto(publishedComicIssue);
  }

  /* Unpublish comic issue */
  @Patch('unpublish/:id')
  async unpublish(@Param('id') id: string): Promise<ComicIssueDto> {
    throw new ForbiddenException(`Endpoint disabled, cannot unpublish ${id}`);
    // const unpublishedComicIssue = await this.comicIssueService.unpublish(+id);
    // return toComicIssueDto(unpublishedComicIssue);
  }

  /* Queue comic issue for deletion */
  @Patch('delete/:id')
  async pseudoDelete(@Param('id') id: string): Promise<ComicIssueDto> {
    const deletedComicIssue = await this.comicIssueService.pseudoDelete(+id);
    return toComicIssueDto(deletedComicIssue);
  }

  /* Remove comic issue for deletion queue */
  @Patch('recover/:id')
  async pseudoRecover(@Param('id') id: string): Promise<ComicIssueDto> {
    const recoveredComicIssue = await this.comicIssueService.pseudoRecover(+id);
    return toComicIssueDto(recoveredComicIssue);
  }
}
