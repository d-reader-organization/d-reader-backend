import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ExpressInterestParams } from './dto/express-interest-params.dto';
import { CampaignService } from './campaign.service';
import { UserEntity } from '../decorators/user.decorator';
import { UserPayload } from '../auth/dto/authorization.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { OptionalUserAuth } from 'src/guards/optional-user-auth.guard';
import {
  toPaginatedUserCampaignInterestDto,
  toUserCampaignInterestDtoArray,
} from './dto/user-campaign-interest.dto';
import {
  CampaignReferralParams,
  ReferredCampaignParams,
} from './dto/campaign-referral-params.dto';
import { ApiFile } from 'src/decorators/api-file.decorator';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  UpdateCampaignDto,
  UpdateCampaignFilesDto,
} from './dto/update-campaign.dto';
import {
  CampaignDto,
  toCampaignDto,
  toCampaignDtoArray,
} from './dto/campaign.dto';
import { plainToInstance } from 'class-transformer';
import { CreatorAuth } from '../guards/creator-auth.guard';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignOwnerAuth } from '../guards/campaign-owner.guard';
import { AdminGuard } from '../guards/roles.guard';
import { GuestInterestParams } from './dto/guest-interest-params.dto';
import { ApiFileArray } from 'src/decorators/api-file-array.decorator';
import {
  AddCampaignRewardBodyDto,
  AddCampaignRewardDto,
  AddCampaignRewardFileDto,
} from './dto/add-reward.dto';
import { CampaignFilterParamsDto } from './dto/campaign-filter-params.dto';
import { toCampaignStatsDto } from './dto/campaign-stats.dto';

@ApiTags('Campaign')
@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  /* Create a new campaign */
  @CreatorAuth()
  @Post('create')
  async create(
    @UserEntity() user: UserPayload,
    @Body() createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignDto> {
    const campaign = await this.campaignService.createCampaign(
      user.id,
      createCampaignDto,
    );
    return toCampaignDto(campaign);
  }

  @UserAuth()
  @Patch('/express-interest/:rewardId')
  async expressInterest(
    @Param('rewardId') rewardId: string,
    @Query() query: ExpressInterestParams,
    @UserEntity() user: UserPayload,
  ) {
    return await this.campaignService.expressUserInterest(
      +rewardId,
      user.id,
      query.ref,
    );
  }

  @Get('/get')
  async findAll(@Query() query: CampaignFilterParamsDto) {
    const campaigns = await this.campaignService.findAll(query);
    return toCampaignDtoArray(campaigns);
  }

  @OptionalUserAuth()
  @Get('/get/:id')
  async findOne(@Param('id') id: string, @UserEntity() user?: UserPayload) {
    const userId = user ? user.id : null;
    const campaign = await this.campaignService.findOne(id, userId);
    return toCampaignDto(campaign);
  }

  @OptionalUserAuth()
  @Get('/get/:id/stats')
  async findStats(@Param('id') id: string, @UserEntity() user?: UserPayload) {
    const userId = user ? user.id : null;
    const stats = await this.campaignService.findStats(id, userId);
    return toCampaignStatsDto(stats);
  }

  @UserAuth()
  @Get('referred/get')
  async findReferredCampaigns(
    @Query() query: ReferredCampaignParams,
    @UserEntity() user: UserPayload,
  ) {
    const campaigns = await this.campaignService.findReferredCampaigns(
      query,
      user.id,
    );
    return toCampaignDtoArray(campaigns);
  }

  @UserAuth()
  @Get('get/:id/referral')
  async findCampaignReferrals(
    @Param('id') id: number,
    @Query() query: CampaignReferralParams,
    @UserEntity() user: UserPayload,
  ) {
    const campaigns = await this.campaignService.findCampaignReferrals(
      +id,
      query,
      user.id,
    );
    return toPaginatedUserCampaignInterestDto(campaigns);
  }

  @Get('/get/:id/backers')
  async find(@Param('id') id: string) {
    const backers = await this.campaignService.findCampaignBackers(id);
    return toUserCampaignInterestDtoArray(backers);
  }

  @CampaignOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor({}))
  @Post('add/:id/rewards')
  async addRewards(
    @Param('id') id: string,
    @ApiFileArray({
      bodyField: 'rewards',
      fileField: 'image',
      bodyType: AddCampaignRewardBodyDto,
      fileType: AddCampaignRewardFileDto,
    })
    addCampaignRewardDto: AddCampaignRewardDto[],
  ) {
    return await this.campaignService.addCampaignRewards(
      +id,
      addCampaignRewardDto,
    );
  }

  /* Update specific campaign */
  @CampaignOwnerAuth()
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.update(
      +id,
      updateCampaignDto,
    );
    return toCampaignDto(updatedCampaign);
  }

  /* Update specific campaign's files */
  @CampaignOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Patch('update/:id/files')
  async updateFiles(
    @Param('id') id: string,
    @UploadedFiles({
      transform: (val) => plainToInstance(UpdateCampaignFilesDto, val),
    })
    files: UpdateCampaignFilesDto,
  ): Promise<CampaignDto> {
    const campaign = await this.campaignService.updateFiles(+id, files);
    return toCampaignDto(campaign);
  }

  /* Update specific campaigns cover file */
  @CampaignOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('cover')
  @UseInterceptors(FileInterceptor('cover'))
  @Patch('update/:slug/cover')
  async updateCover(
    @Param('id') id: string,
    @UploadedFile() cover: Express.Multer.File,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.updateFile(
      +id,
      cover,
      'cover',
    );
    return toCampaignDto(updatedCampaign);
  }

  /* Update specific campaign banner file */
  @CampaignOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('banner')
  @UseInterceptors(FileInterceptor('banner'))
  @Patch('update/:id/banner')
  async updateBanner(
    @Param('id') id: string,
    @UploadedFile() banner: Express.Multer.File,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.updateFile(
      +id,
      banner,
      'banner',
    );
    return toCampaignDto(updatedCampaign);
  }

  /* Update specific campaign info file */
  @CampaignOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('info')
  @UseInterceptors(FileInterceptor('info'))
  @Patch('update/:id/info')
  async updateLogo(
    @Param('id') id: string,
    @UploadedFile() info: Express.Multer.File,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.updateFile(
      +id,
      info,
      'info',
    );
    return toCampaignDto(updatedCampaign);
  }

  /* Update specific campaign video file */
  @CampaignOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('video')
  @UseInterceptors(FileInterceptor('video'))
  @Patch('update/:id/video')
  async updateVideo(
    @Param('id') id: string,
    @UploadedFile() video: Express.Multer.File,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.updateFile(
      +id,
      video,
      'video',
    );
    return toCampaignDto(updatedCampaign);
  }

  @AdminGuard()
  @ApiExcludeEndpoint()
  @Patch('guest/interest')
  async expressGuestInterest(@Query() query: GuestInterestParams) {
    return await this.campaignService.expressGuestInterest(query);
  }
}
