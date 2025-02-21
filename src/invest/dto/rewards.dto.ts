import { InvestCampaignReward } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsNumber, IsString } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';

export class CampaignRewardDto {
  @IsInt()
  id: number;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  image: string;

  @IsNumber()
  price: number;
}

export function toCampaignRewardDto(input: InvestCampaignReward) {
  const plainCampaignRewardDto: CampaignRewardDto = {
    id: input.id,
    title: input.title,
    description: input.description,
    image: getPublicUrl(input.image),
    price: input.price,
  };

  const rewardDto = plainToInstance(CampaignRewardDto, plainCampaignRewardDto);
  return rewardDto;
}

export function toCampaignRewardDtoArray(rewards: InvestCampaignReward[]) {
  return rewards.map(toCampaignRewardDto);
}
