import { ApiProperty } from '@nestjs/swagger';
import { WheelReward, WheelRewardType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { getWheelAdminS3Folder } from 'src/utils/wheel';

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
  description?: string;

  @IsString()
  image: string;

  @IsString()
  icon: string;

  @IsEnum(WheelRewardType)
  @ApiProperty({ enum: WheelRewardType })
  type: WheelRewardType;
}

export function toRewardDto(input: WheelReward) {
  const icon = input.icon ?? getWheelAdminS3Folder(input.type, 'icon');
  const image = input.image ?? getWheelAdminS3Folder(input.type, 'image');

  const plainRewardDto: RewardDto = {
    id: input.id,
    name: input.name,
    description: input.description,
    icon: getPublicUrl(icon),
    image: getPublicUrl(image),
    weight: input.weight,
    wheelId: input.wheelId,
    type: input.type,
  };

  return plainToInstance(RewardDto, plainRewardDto);
}

export function toRewardDtoArray(inputs: WheelReward[]) {
  return inputs.map(toRewardDto);
}
