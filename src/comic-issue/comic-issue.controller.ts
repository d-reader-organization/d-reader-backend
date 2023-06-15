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
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { Creator, Wallet, Role } from '@prisma/client';
import { ComicIssueFilterParams } from './dto/comic-issue-filter-params.dto';
import { WalletComicIssueService } from './wallet-comic-issue.service';
import { RateComicDto } from 'src/comic/dto/rate-comic.dto'; // rename or put into shared? @josi
import {
  ComicPageDto,
  toComicPageDtoArray,
} from 'src/comic-page/entities/comic-page.dto';
import { PublishOnChainDto } from './dto/publish-on-chain.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { SkipUpdateGuard } from 'src/guards/skip-update-guard';
import {
  CoverDto,
  CreateStatefulCoverBodyDto,
  CreateStatefulCoverDto,
  CreateStatelessCoverBodyDto,
  CreateStatelessCoverDto,
} from './dto/create-comic-covers.dto';
import { ApiFileArray } from '../decorators/api-file-array.decorator';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(RestAuthGuard, RolesGuard, ComicIssueUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic Issue')
@Controller('comic-issue')
export class ComicIssueController {
  constructor(
    private readonly comicIssueService: ComicIssueService,
    private readonly walletComicIssueService: WalletComicIssueService,
  ) {}

  // https://github.com/swagger-api/swagger-ui/issues/7625
  /* Create a new comic issue */
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateComicIssueSwaggerDto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      // { name: 'pages', maxCount: 1 },
    ]),
  )
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

    return await toComicIssueDto(comicIssue);
  }

  /* Get all comic issues */
  @Get('get')
  async findAll(
    @Query() query: ComicIssueFilterParams,
  ): Promise<ComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAll(query);
    return await toComicIssueDtoArray(comicIssues);
  }

  // TODO v2: get by comicSlug & (comic issue) slug
  /* Get specific comic issue by unique id */
  @Get('get/:id')
  async findOne(
    @Param('id') id: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.findOne(
      +id,
      wallet.address,
    );
    return await toComicIssueDto(comicIssue);
  }

  @Get('get/:id/pages')
  async getPages(
    @Param('id') id: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicPageDto[]> {
    const pages = await this.comicIssueService.getPages(+id, wallet.address);
    return await toComicPageDtoArray(pages);
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
    return await toComicIssueDto(updatedComicIssue);
  }

  /* Favouritise/unfavouritise a specific comic issue */
  @SkipUpdateGuard()
  @Patch('favouritise/:id')
  async favouritise(
    @Param('id') id: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicIssueDto> {
    await this.walletComicIssueService.toggleState(
      wallet.address,
      +id,
      'isFavourite',
    );
    return await this.findOne(id, wallet);
  }

  /* Rate specific comic issue */
  @SkipUpdateGuard()
  @Patch('rate/:id')
  async rate(
    @Param('id') id: string,
    @Body() rateComicDto: RateComicDto,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicIssueDto> {
    await this.walletComicIssueService.rate(
      wallet.address,
      +id,
      rateComicDto.rating,
    );
    return await this.findOne(id, wallet);
  }

  /* Reads a specific comic issue */
  @SkipUpdateGuard()
  @Patch('read/:id')
  async read(
    @Param('id') id: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicIssueDto> {
    await this.comicIssueService.read(+id, wallet.address);
    return await this.findOne(id, wallet);
  }

  /* Update specific comic issues cover file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('signature')
  @UseInterceptors(FileInterceptor('signature'))
  @Patch('update/:id/signature')
  async updateCover(
    @Param('id') id: string,
    @UploadedFile() signature: Express.Multer.File,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.updateFile(
      +id,
      signature,
      'signature',
    );
    return await toComicIssueDto(updatedComicIssue);
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
    return await toComicIssueDto(publishedComicIssue);
  }

  /* Publish comic issue */
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('publish/:id')
  async publish(@Param('id') id: string): Promise<ComicIssueDto> {
    const publishedComicIssue = await this.comicIssueService.publish(+id);
    return await toComicIssueDto(publishedComicIssue);
  }

  /* Unpublish comic issue */
  @Patch('unpublish/:id')
  async unpublish(@Param('id') id: string): Promise<ComicIssueDto> {
    throw new ForbiddenException(`Endpoint disabled, cannot unpublish ${id}`);
    // const unpublishedComicIssue = await this.comicIssueService.unpublish(+id);
    // return await toComicIssueDto(unpublishedComicIssue);
  }

  /* Queue comic issue for deletion */
  @Patch('delete/:id')
  async pseudoDelete(@Param('id') id: string): Promise<ComicIssueDto> {
    const deletedComicIssue = await this.comicIssueService.pseudoDelete(+id);
    return await toComicIssueDto(deletedComicIssue);
  }

  /* Remove comic issue for deletion queue */
  @Patch('recover/:id')
  async pseudoRecover(@Param('id') id: string): Promise<ComicIssueDto> {
    const recoveredComicIssue = await this.comicIssueService.pseudoRecover(+id);
    return await toComicIssueDto(recoveredComicIssue);
  }

  /* Upload Stateless covers */
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Post('upload-covers/stateless/:id')
  async uploadStatelessCovers(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'data',
      fileField: 'cover',
      bodyType: CreateStatelessCoverBodyDto,
      fileType: CoverDto,
    })
    statelessCoverDto: CreateStatelessCoverDto[],
  ) {
    const comicIssue = await this.comicIssueService.uploadStatelessCovers(
      statelessCoverDto,
      +id,
    );
    return toComicIssueDto(comicIssue);
  }

  /* Upload Stateful covers */
  @Post('upload-covers/stateful/:id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  async uploadStatefulCovers(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'data',
      fileField: 'cover',
      bodyType: CreateStatefulCoverBodyDto,
      fileType: CoverDto,
    })
    statefulCoverDto: [CreateStatefulCoverDto],
  ) {
    const comicIssue = await this.comicIssueService.uploadStatefulCovers(
      statefulCoverDto,
      +id,
    );
    return toComicIssueDto(comicIssue);
  }

  /* Update Stateless covers */
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Patch('update-covers/stateless/:id')
  async updateStatelessCovers(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'data',
      fileField: 'cover',
      bodyType: CreateStatelessCoverBodyDto,
      fileType: CoverDto,
    })
    statelessCoverDto: CreateStatelessCoverDto[],
  ) {
    const comicIssue = await this.comicIssueService.updateStatelessCovers(
      statelessCoverDto,
      +id,
    );
    return toComicIssueDto(comicIssue);
  }

  /* Update Stateful covers */
  @Patch('update-covers/stateful/:id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  async updateStatefulCovers(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'data',
      fileField: 'cover',
      bodyType: CreateStatefulCoverBodyDto,
      fileType: CoverDto,
    })
    statefulCoverDto: [CreateStatefulCoverDto],
  ) {
    const comicIssue = await this.comicIssueService.updateStatefulCovers(
      statefulCoverDto,
      +id,
    );
    return toComicIssueDto(comicIssue);
  }
}
