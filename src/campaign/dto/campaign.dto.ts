import {
  Campaign,
  CampaignReward,
  CreatorChannel,
  Genre,
} from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  PartialCreatorDto,
  toPartialCreatorDto,
} from 'src/creator/dto/partial-creator.dto';
import { CampaignRewardDto, toCampaignRewardDtoArray } from './rewards.dto';
import { getPublicUrl } from '../../aws/s3client';
import { ifDefined } from '../../utils/lodash';
import {
  CampaignStatsDto,
  CampaignStatsInput,
  toCampaignStatsDto,
} from './campaign-stats.dto';

export class CampaignDto {
  @IsInt()
  id: number;

  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  description: string;

  @IsString()
  subtitle: string;

  @IsString()
  banner: string;

  @IsString()
  cover: string;

  @IsString()
  info: string;

  @IsUrl()
  videoUrl: string;

  @IsInt()
  raiseGoal: number;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @Type(() => CampaignStatsDto)
  stats?: CampaignStatsDto;

  @IsOptional()
  @Type(() => PartialCreatorDto)
  creator?: PartialCreatorDto;

  @IsOptional()
  @IsArray()
  @Type(() => CampaignRewardDto)
  rewards?: CampaignRewardDto[];
}

type WithStats = { stats?: CampaignStatsInput };
type WithGenres = { genres?: Genre[] };
type WithCreator = { creator?: CreatorChannel };
type WithRewards = { rewards?: CampaignReward[] };

export type CampaignInput = Campaign &
  WithRewards &
  WithGenres &
  WithCreator &
  WithStats;

export function toCampaignDto(campaign: CampaignInput) {
  const plainCampaignDto: CampaignDto = {
    id: campaign.id,
    raiseGoal: campaign.raiseGoal,
    title: campaign.title,
    subtitle: campaign.subtitle,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    slug: campaign.slug,
    cover: ifDefined(campaign.cover, getPublicUrl),
    banner: ifDefined(campaign.banner, getPublicUrl),
    videoUrl: campaign.video,
    info: ifDefined(campaign.info, getPublicUrl),
    description: campaign.description,
    creator: ifDefined(campaign.creator, toPartialCreatorDto),
    rewards: ifDefined(campaign.rewards, toCampaignRewardDtoArray),
    stats: ifDefined(campaign.stats, toCampaignStatsDto),
  };

  const campaignDto = plainToInstance(CampaignDto, plainCampaignDto);
  return campaignDto;
}

export const toCampaignDtoArray = (inputs: CampaignInput[]) => {
  return inputs.map(toCampaignDto);
};
