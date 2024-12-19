import { WheelReward, WheelRewardType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';

export class RewardDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsInt()
  weight: number;

  @IsInt()
  wheelId: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  image: string;

  @IsEnum(WheelRewardType)
  type: WheelRewardType;
}

export function toRewardDto(input: WheelReward) {
  const plainRewardDto: RewardDto = {
    id: input.id,
    name: input.name,
    description: input.description,
    image: input.image ? getPublicUrl(input.image) : undefined,
    weight: input.weight,
    wheelId: input.wheelId,
    type: input.type,
  };

  return plainToInstance(RewardDto, plainRewardDto);
}

export function toRewardDtoArray(inputs: WheelReward[]) {
  return inputs.map(toRewardDto);
}
