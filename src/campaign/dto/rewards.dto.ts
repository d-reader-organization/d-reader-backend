import { CampaignReward } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsNumber, IsString } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';

export class CampaignRewardDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  image: string;

  @IsNumber()
  price: number;
}

export function toCampaignRewardDto(input: CampaignReward) {
  const plainCampaignRewardDto: CampaignRewardDto = {
    id: input.id,
    name: input.name,
    description: input.description,
    image: getPublicUrl(input.image),
    price: input.price,
  };

  const rewardDto = plainToInstance(CampaignRewardDto, plainCampaignRewardDto);
  return rewardDto;
}

export function toCampaignRewardDtoArray(rewards: CampaignReward[]) {
  return rewards.map(toCampaignRewardDto);
}
