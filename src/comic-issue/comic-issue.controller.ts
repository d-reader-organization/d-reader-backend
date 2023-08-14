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
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  OwnedComicIssueDto,
  toOwnedComicIssueDtoArray,
} from './dto/owned-comic-issue.dto';
import { CreatorPayload, UserPayload } from 'src/auth/dto/authorization.dto';
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
import { CreatorEntity } from 'src/decorators/creator.decorator';
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
import {
  CreateComicIssueDto,
  CreateComicIssueBodyDto,
  CreateComicIssueFilesDto,
} from './dto/create-comic-issue.dto';
import { UpdateComicIssueDto } from './dto/update-comic-issue.dto';
import { ComicPageService } from 'src/comic-page/comic-page.service';

@UseGuards(ThrottlerGuard)
@ApiTags('Comic Issue')
@Controller('comic-issue')
export class ComicIssueController {
  constructor(
    private readonly comicIssueService: ComicIssueService,
    private readonly userComicIssueService: UserComicIssueService,
    private readonly comicPageService: ComicPageService,
  ) {}

  /* Create a new comic issue */
  @ComicIssueOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateComicIssueDto })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'cover', maxCount: 1 }]))
  @Post('create')
  async create(
    @CreatorEntity() creator: CreatorPayload,
    @Body() createComicIssueDto: CreateComicIssueBodyDto,
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
  @UserAuth()
  @Get('get/:id')
  async findOne(
    @Param('id') id: string,
    @UserEntity() user: UserPayload,
  ): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.findOne(+id, user.id);
    return toComicIssueDto(comicIssue);
  }

  /* Get specific comic issue's pages */
  @UserAuth()
  @Get('get/:id/pages')
  async getPages(
    @Param('id') id: string,
    @UserEntity() user: UserPayload,
  ): Promise<ComicPageDto[]> {
    const pages = await this.comicIssueService.getPages(+id, user.id);
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

  /* Update specific comic issues signature file */
  @ComicIssueOwnerAuth()
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
  @ComicIssueOwnerAuth()
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
  @ComicIssueOwnerAuth()
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
  @ComicIssueOwnerAuth()
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

  /* Favouritise/unfavouritise a specific comic issue */
  @UserAuth()
  @Patch('favouritise/:id')
  async favouritise(@Param('id') id: string, @UserEntity() user: UserPayload) {
    await this.userComicIssueService.toggleState(user.id, +id, 'isFavourite');
  }

  /* Rate specific comic issue */
  @UserAuth()
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

  /* Queue comic issue for deletion */
  @ComicIssueOwnerAuth()
  @Patch('delete/:id')
  async pseudoDelete(@Param('id') id: string) {
    await this.comicIssueService.pseudoDelete(+id);
  }

  /* Remove comic issue for deletion queue */
  @ComicIssueOwnerAuth()
  @Patch('recover/:id')
  async pseudoRecover(@Param('id') id: string) {
    await this.comicIssueService.pseudoRecover(+id);
  }
}
