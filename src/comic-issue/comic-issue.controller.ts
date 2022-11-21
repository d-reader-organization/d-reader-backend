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
  Query,
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
import {
  ComicIssueDto,
  toComicIssueDto,
  toComicIssueDtoArray,
} from './dto/comic-issue.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { ComicIssueUpdateGuard } from 'src/guards/comic-issue-update.guard';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { Creator, Wallet } from '@prisma/client';
import { CandyMachineService } from 'src/vendors/candy-machine.service';
import { ComicIssueFilterParams } from './dto/comic-issue-filter-params.dto';

@UseGuards(RestAuthGuard, ComicIssueUpdateGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic Issue')
@Controller('comic-issue')
export class ComicIssueController {
  constructor(
    private readonly comicIssueService: ComicIssueService,
    private readonly candyMachineService: CandyMachineService,
  ) {}

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Post('find-minted-nfts')
  async findMintedNfts() {
    return await this.candyMachineService.findMintedNfts();
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Post('create-candy-machine')
  async createCandyMachine() {
    return await this.candyMachineService.create();
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Post('mint-one')
  async mintOne() {
    return await this.candyMachineService.mintOne();
  }

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

  /* Get specific comic issue by unique id */
  @Get('get/:id')
  async findOne(
    @Param('id') id: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.findOneProtected(
      +id,
      wallet.address,
    );
    return await toComicIssueDto(comicIssue);
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

  /* Update specific comic issues cover file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('cover')
  @UseInterceptors(FileInterceptor('cover'))
  @Patch('update/:id/cover')
  async updateCover(
    @Param('id') id: string,
    @UploadedFile() cover: Express.Multer.File,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.updateFile(
      +id,
      cover,
    );
    return await toComicIssueDto(updatedComicIssue);
  }

  /* Update specific comic issues soundtrack file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('soundtrack')
  @UseInterceptors(FileInterceptor('soundtrack'))
  @Patch('update/:id/soundtrack')
  async updateSoundtrack(
    @Param('id') id: string,
    @UploadedFile() soundtrack: Express.Multer.File,
  ): Promise<ComicIssueDto> {
    const updatedComicIssue = await this.comicIssueService.updateFile(
      +id,
      soundtrack,
    );
    return await toComicIssueDto(updatedComicIssue);
  }

  /* Publish comic issue */
  @Patch('publish/:id')
  async publish(@Param('id') id: string): Promise<ComicIssueDto> {
    const publishedComicIssue = await this.comicIssueService.publish(+id);
    return await toComicIssueDto(publishedComicIssue);
  }

  /* Unpublish comic issue */
  @Patch('unpublish/:id')
  async unpublish(@Param('id') id: string): Promise<ComicIssueDto> {
    const unpublishedComicIssue = await this.comicIssueService.unpublish(+id);
    return await toComicIssueDto(unpublishedComicIssue);
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

  /* Completely remove specific comic issue, including files from s3 bucket */
  @Delete('remove/:id')
  remove(@Param('id') id: string) {
    return this.comicIssueService.remove(+id);
  }
}
