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
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ExpressInterestDto } from './dto/express-interest.dto';
import { CampaignService } from './campaign.service';
import { UserEntity } from '../decorators/user.decorator';
import { UserPayload } from '../auth/dto/authorization.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { OptionalUserAuth } from 'src/guards/optional-user-auth.guard';
import {
  toPaginatedUserCampaignInterestedReceiptDto,
  toUserCampaignInterestedReceiptDtoArray,
} from './dto/user-campaign-interested-receipt.dto';
import { CacheInterceptor } from '../cache/cache.interceptor';
import { minutes } from '@nestjs/throttler';
import {
  CampaignReferralParams,
  ReferredCampaignParams,
} from './dto/campaign-referral-params.dto';
import { ApiFile } from 'src/decorators/api-file.decorator';
import {
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

@ApiTags('Campaign')
@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  /* Create a new campaign */
  @CreatorAuth()
  @Post('create')
  async create(
    @UserEntity() creator: UserPayload,
    @Body() createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignDto> {
    const campaign = await this.campaignService.createCampaign(
      creator.id,
      createCampaignDto,
    );
    return toCampaignDto(campaign);
  }

  @UserAuth()
  @Patch('/express-interest/:slug')
  async expressInterest(
    @Param('slug') slug: string,
    @Body() expressInterestDto: ExpressInterestDto,
    @UserEntity() user: UserPayload,
  ) {
    const { ref, expressedAmount } = expressInterestDto;
    return await this.campaignService.expressUserInterest(
      slug,
      expressedAmount,
      user.id,
      ref,
    );
  }

  @UseInterceptors(CacheInterceptor({ ttl: minutes(10) }))
  @Get('/get')
  async findAll() {
    const campaigns = await this.campaignService.findAll();
    return toCampaignDtoArray(campaigns);
  }

  @OptionalUserAuth()
  @Get('/get/:slug')
  async findOne(@Param('slug') slug: string, @UserEntity() user?: UserPayload) {
    const userId = user ? user.id : null;
    const campaign = await this.campaignService.findOne(slug, userId);
    return toCampaignDto(campaign);
  }

  @UserAuth()
  @Get('/get/referred')
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
  @Get('/get/:slug/referrals')
  async findCampaignReferrals(
    @Query() query: CampaignReferralParams,
    @UserEntity() user: UserPayload,
  ) {
    const campaigns = await this.campaignService.findCampaignReferrals(
      query,
      user.id,
    );
    return toPaginatedUserCampaignInterestedReceiptDto(campaigns);
  }

  @Get('/get/:slug/interest-receipts')
  async find(@Param('slug') slug: string) {
    const receipts =
      await this.campaignService.findUserCampaignInterestReceipts(slug);
    return toUserCampaignInterestedReceiptDtoArray(receipts);
  }

  /* Update specific campaign */
  // @ComicOwnerAuth()
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.update(
      slug,
      updateCampaignDto,
    );
    return toCampaignDto(updatedCampaign);
  }

  /* Update specific campaign's files */
  // @ComicOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Patch('update/:slug/files')
  async updateFiles(
    @Param('slug') slug: string,
    @UploadedFiles({
      transform: (val) => plainToInstance(UpdateCampaignFilesDto, val),
    })
    files: UpdateCampaignFilesDto,
  ): Promise<CampaignDto> {
    const campaign = await this.campaignService.updateFiles(slug, files);
    return toCampaignDto(campaign);
  }

  /* Update specific campaigns cover file */
  // @ComicOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('cover')
  @UseInterceptors(FileInterceptor('cover'))
  @Patch('update/:slug/cover')
  async updateCover(
    @Param('slug') slug: string,
    @UploadedFile() cover: Express.Multer.File,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.updateFile(
      slug,
      cover,
      'cover',
    );
    return toCampaignDto(updatedCampaign);
  }

  /* Update specific campaign banner file */
  // @ComicOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('banner')
  @UseInterceptors(FileInterceptor('banner'))
  @Patch('update/:slug/banner')
  async updateBanner(
    @Param('slug') slug: string,
    @UploadedFile() banner: Express.Multer.File,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.updateFile(
      slug,
      banner,
      'banner',
    );
    return toCampaignDto(updatedCampaign);
  }

  /* Update specific campaign logo file */
  // @ComicOwnerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiFile('logo')
  @UseInterceptors(FileInterceptor('logo'))
  @Patch('update/:slug/logo')
  async updateLogo(
    @Param('slug') slug: string,
    @UploadedFile() logo: Express.Multer.File,
  ): Promise<CampaignDto> {
    const updatedCampaign = await this.campaignService.updateFile(
      slug,
      logo,
      'logo',
    );
    return toCampaignDto(updatedCampaign);
  }
}
