import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  UploadedFiles,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import {
  UpdateCreatorDto,
  UpdateCreatorFilesDto,
} from 'src/creator/dto/update-creator.dto';
import { CreatorService } from './creator.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  CreatorChannelDto,
  toCreatorDto,
  toCreatorDtoArray,
} from './dto/creator.dto';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { CreatorOwnerAuth } from 'src/guards/creator-owner.guard';
import { CreatorFilterParams } from './dto/creator-params.dto';
import { UserCreatorService } from './user-creator.service';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { plainToInstance } from 'class-transformer';
import {
  RawCreatorDto,
  toRawCreatorDto,
  toRawCreatorDtoArray,
} from './dto/raw-creator.dto';
import { RawCreatorFilterParams } from './dto/raw-creator-params.dto';
import { AdminGuard } from '../guards/roles.guard';
import { SearchCreatorParams } from './dto/search-creator-params.dto';
import {
  SearchCreatorDto,
  toSearchCreatorDtoArray,
} from './dto/search-creator.dto';
import { OptionalUserAuth } from 'src/guards/optional-user-auth.guard';
import { CreatorActivityFeedParams } from './dto/creator-activity-feed-params.dto';
import {
  CreatorActivityFeedDto,
  toCreatorActivityFeedDtoArray,
} from './dto/creator-activity-feed.dto';
import { CreateCreatorChannelDto } from './dto/create-channel.dto';
import { TakeSnapshotParams } from './dto/take-snapshot-params.dto';
import { ChartParams } from './dto/chart-params.dto';
import { RevenueChartDto, toRevenueChartDto } from './dto/revenue-chart.dto';
import { AudienceChartDto, toAudienceChartDto } from './dto/audience-chart.dto';
import { SaleTransactionParams } from './dto/sale-transaction-params.dto';
import {
  SaleTransactionDto,
  toSaleTransactionDtoArray,
} from './dto/sale-transaction-history.dto';
import { AdminOrCreatorOwner } from 'src/guards/admin-or-creator-owner.guard';

@ApiTags('Creator')
@Controller('creator')
export class CreatorController {
  constructor(
    private readonly creatorService: CreatorService,
    private readonly userCreatorService: UserCreatorService,
  ) {}

  @UserAuth()
  @Post('create')
  async createChannel(
    @UserEntity() user: UserPayload,
    @Body() createCreatorChannelDto: CreateCreatorChannelDto,
  ) {
    const creator = await this.creatorService.create(
      user.id,
      createCreatorChannelDto,
    );
    return toCreatorDto(creator);
  }

  /* Get creator data from auth token */
  @UserAuth()
  @Get('get/me')
  async findMe(@UserEntity() user: UserPayload): Promise<CreatorChannelDto> {
    const me = await this.creatorService.findMe(user.id);
    return toCreatorDto(me);
  }

  /* Get all creators */
  // @UseInterceptors(CacheInterceptor({ ttl: minutes(30) }))
  @OptionalUserAuth()
  @Get('get')
  async findAll(
    @Query() query: CreatorFilterParams,
    @UserEntity() user?: UserPayload,
  ): Promise<CreatorChannelDto[]> {
    const creators = await this.creatorService.findAll({
      query,
      userId: user?.id,
    });
    return toCreatorDtoArray(creators);
  }

  /* Search all creators */
  @Get('search')
  async searchAll(
    @Query() query: SearchCreatorParams,
  ): Promise<SearchCreatorDto[]> {
    const creators = await this.creatorService.searchAll(query);
    return toSearchCreatorDtoArray(creators);
  }

  /* Get specific creator by unique id or handle */
  @OptionalUserAuth()
  @Get('get/:id')
  async findOne(
    @Param('id') id: string,
    @UserEntity() user?: UserPayload,
  ): Promise<CreatorChannelDto> {
    const creator = await this.creatorService.findOne(id, user?.id);
    return toCreatorDto(creator);
  }

  /* Get all creator in raw format*/
  @AdminGuard()
  @Get('get-raw')
  async findAllRaw(
    @Query() query: RawCreatorFilterParams,
  ): Promise<RawCreatorDto[]> {
    const creator = await this.creatorService.findAllRaw(query);
    return toRawCreatorDtoArray(creator);
  }

  /* Get specific creator in raw format by unique id or handle */
  @CreatorOwnerAuth()
  @Get('get-raw/:id')
  async findOneRaw(@Param('id') id: string): Promise<RawCreatorDto> {
    const creator = await this.creatorService.findOneRaw(id);
    return toRawCreatorDto(creator);
  }

  @Get('get/followed-by-user/:userId')
  async findFollowedByUser(
    @Param('userId') userId: string,
    @Query() query: CreatorFilterParams,
  ) {
    const creators = await this.userCreatorService.getCreatorsFollowedByUser({
      query,
      userId: +userId,
    });
    return toCreatorDtoArray(creators);
  }

  @AdminOrCreatorOwner()
  @Get('activity-feed/get')
  async findCreatorActivityFeed(
    @Query() query: CreatorActivityFeedParams,
  ): Promise<CreatorActivityFeedDto[]> {
    const feed = await this.creatorService.findCreatorActivityFeed(query);
    return toCreatorActivityFeedDtoArray(feed);
  }

  @CreatorOwnerAuth()
  @Get('get/:id/chart/revenue')
  async findRevenueChart(
    @Param('id') id: string,
    @Query() query: ChartParams,
  ): Promise<RevenueChartDto> {
    const chart = await this.userCreatorService.getRevenueChartData(+id, query);
    return toRevenueChartDto(chart);
  }

  @CreatorOwnerAuth()
  @Get('get/:id/chart/audience')
  async findAudienceChart(
    @Param('id') id: string,
    @Query() query: ChartParams,
  ): Promise<AudienceChartDto> {
    const chart = await this.userCreatorService.getAudienceChartData(
      +id,
      query,
    );
    return toAudienceChartDto(chart);
  }

  @AdminOrCreatorOwner()
  @Get('sale-transaction/get')
  async findSaleTransactions(
    @Query() query: SaleTransactionParams,
  ): Promise<SaleTransactionDto[]> {
    const transactions = await this.creatorService.findSaleTransactions(query);
    return toSaleTransactionDtoArray(transactions);
  }

  /* Update specific creator */
  @CreatorOwnerAuth()
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateCreatorDto: UpdateCreatorDto,
  ): Promise<CreatorChannelDto> {
    const updatedCreator = await this.creatorService.update(
      +id,
      updateCreatorDto,
    );
    return toCreatorDto(updatedCreator);
  }

  /* Update specific creator's files */
  @CreatorOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  @Patch('update/:id/files')
  async updateFiles(
    @Param('id') id: string,
    @UploadedFiles({
      transform: (val) => plainToInstance(UpdateCreatorFilesDto, val),
    })
    files: UpdateCreatorFilesDto,
  ): Promise<CreatorChannelDto> {
    const creator = await this.creatorService.updateFiles(+id, files);
    return toCreatorDto(creator);
  }

  /* Update specific creators avatar file */
  @CreatorOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch('update/:id/avatar')
  async updateAvatar(
    @Param('id') id: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<CreatorChannelDto> {
    const updatedCreator = await this.creatorService.updateFile(
      +id,
      avatar,
      'avatar',
    );
    return toCreatorDto(updatedCreator);
  }

  /* Update specific creators banner file */
  @CreatorOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('banner')
  @UseInterceptors(FileInterceptor('banner'))
  @Patch('update/:id/banner')
  async updateBanner(
    @Param('id') id: string,
    @UploadedFile() banner: Express.Multer.File,
  ): Promise<CreatorChannelDto> {
    const updatedCreator = await this.creatorService.updateFile(
      +id,
      banner,
      'banner',
    );
    return toCreatorDto(updatedCreator);
  }

  /* Queue creator for deletion */
  @CreatorOwnerAuth()
  @Patch('delete/:id')
  async pseudoDelete(@Param('id') id: string) {
    await this.creatorService.pseudoDelete(+id);
  }

  /* Remove creator for deletion queue */
  @CreatorOwnerAuth()
  @Patch('recover/:id')
  async pseudoRecover(@Param('id') id: string) {
    await this.creatorService.pseudoRecover(+id);
  }

  @AdminGuard()
  @Post('take-snapshot')
  async takeSnapshot(@Query() query: TakeSnapshotParams) {
    return await this.userCreatorService.snapshot(query.date);
  }

  /* Follow a creator channel*/
  @UserAuth()
  @Patch('follow/:id')
  async follow(@UserEntity() user: UserPayload, @Param('id') id: string) {
    await this.userCreatorService.follow(user.id, +id);
  }

  @AdminGuard()
  @Get('download-assets/:id')
  async downloadAssets(@Param('id') id: string) {
    return await this.creatorService.dowloadAssets(+id);
  }
}
