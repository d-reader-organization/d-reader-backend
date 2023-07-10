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
    private readonly walletComicIssueService: WalletComicIssueService,
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
  async findAll(
    @Query() query: ComicIssueFilterParams,
  ): Promise<ComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAll(query);
    return toComicIssueDtoArray(comicIssues);
  }

  @Get('get/by-owner/:address')
  async findOwnedComicIssues(
    @Param('address') address: string,
    @Query() query: ComicIssueFilterParams,
  ): Promise<OwnedComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAllByOwner(
      query,
      address,
    );
    return toOwnedComicIssueDtoArray(comicIssues);
  }

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
    return toComicIssueDto(comicIssue);
  }

  @Get('get/:id/pages')
  async getPages(
    @Param('id') id: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicPageDto[]> {
    const pages = await this.comicIssueService.getPages(+id, wallet.address);
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
  async favouritise(
    @Param('id') id: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicIssueDto> {
    await this.walletComicIssueService.toggleState(
      wallet.address,
      +id,
      'isFavourite',
    );
    return this.findOne(id, wallet);
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
    return this.findOne(id, wallet);
  }

  /* Reads a specific comic issue */
  @SkipUpdateGuard()
  @Patch('read/:id')
  async read(
    @Param('id') id: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicIssueDto> {
    await this.comicIssueService.read(+id, wallet.address);
    return this.findOne(id, wallet);
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
  @Patch('publish/:id')
  async publish(@Param('id') id: string): Promise<ComicIssueDto> {
    const publishedComicIssue = await this.comicIssueService.publish(+id);
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
