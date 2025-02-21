import { ApiProperty } from '@nestjs/swagger';
import {
  CreatorChannel,
  Genre,
  InvestCampaign,
  InvestCampaignInfo,
  InvestCampaignInfoSection,
  InvestCampaignReward,
} from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  PartialCreatorDto,
  toPartialCreatorDto,
} from 'src/creator/dto/partial-creator.dto';
import {
  PartialGenreDto,
  toPartialGenreDtoArray,
} from 'src/genre/dto/partial-genre.dto';
import { CampaignRewardDto, toCampaignRewardDtoArray } from './rewards.dto';
import { getPublicUrl } from '../../aws/s3client';
import { ifDefined } from '../../utils/lodash';
import {
  CampaignStatsDto,
  CampaignStatsInput,
  toCampaignStatsDto,
} from './campaign-stats.dto';

export class CampaignInfoDto {
  @IsInt()
  id: number;

  @ApiProperty({ enum: InvestCampaignInfoSection })
  @IsEnum({ InvestCampaignInfoSection })
  section: InvestCampaignInfoSection;

  @IsString()
  value: string;

  @IsString()
  image: string;
}

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
  logo: string;

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
  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];

  @IsOptional()
  @Type(() => PartialCreatorDto)
  creator?: PartialCreatorDto;

  @IsOptional()
  @IsArray()
  @Type(() => CampaignInfoDto)
  info?: CampaignInfoDto[];

  @IsOptional()
  @IsArray()
  @Type(() => CampaignRewardDto)
  rewards?: CampaignRewardDto[];
}

type WithStats = { stats?: CampaignStatsInput };
type WithGenres = { genres?: Genre[] };
type WithCreator = { creator?: CreatorChannel };
type WithRewards = { rewards?: InvestCampaignReward[] };
type WithInfo = { info?: InvestCampaignInfo[] };

export type CampaignInput = InvestCampaign &
  WithRewards &
  WithInfo &
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
    logo: ifDefined(campaign.logo, getPublicUrl),
    description: campaign.description,
    genres: ifDefined(campaign.genres, toPartialGenreDtoArray),
    creator: ifDefined(campaign.creator, toPartialCreatorDto),
    rewards: ifDefined(campaign.rewards, toCampaignRewardDtoArray),
    info: ifDefined(campaign.info, toCampaignInfoDtoArray),
    stats: ifDefined(campaign.stats, toCampaignStatsDto),
  };

  const campaignDto = plainToInstance(CampaignDto, plainCampaignDto);
  return campaignDto;
}

export const toCampaignDtoArray = (inputs: CampaignInput[]) => {
  return inputs.map(toCampaignDto);
};

function toCampaignInfoDto(input: InvestCampaignInfo) {
  const plainCampaignInfoDto: CampaignInfoDto = {
    id: input.id,
    section: input.section,
    value: input.value,
    image: ifDefined(input.image, getPublicUrl),
  };

  const campaignInfoDto = plainToInstance(
    CampaignInfoDto,
    plainCampaignInfoDto,
  );
  return campaignInfoDto;
}

function toCampaignInfoDtoArray(inputs: InvestCampaignInfo[]) {
  return inputs.map(toCampaignInfoDto);
}
