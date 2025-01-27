import { ApiProperty } from '@nestjs/swagger';
import { Wheel, WheelReward, WheelType } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { RewardDto, toRewardDtoArray } from './rewards.dto';
import { ifDefined } from 'src/utils/lodash';
import {
  toWheelRewardNotificationDto,
  WheelRewardNotificationDto,
  WheelRewardNotificationInput,
} from './wheel-reward-notification.dto';

export class WheelDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @Type(() => WheelRewardNotificationDto)
  lastRewardNotification: WheelRewardNotificationDto;

  @IsOptional()
  @IsDate()
  nextSpinAt?: Date;

  @IsEnum(WheelType)
  @ApiProperty({ enum: WheelType })
  type: WheelType;

  @IsDate()
  startsAt: Date;

  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsArray()
  @Type(() => RewardDto)
  rewards?: RewardDto[];

  @IsNumber()
  winProbability: number;

  @IsBoolean()
  isActive: boolean;
}

type WithWheelRewards = { rewards?: WheelReward[] };
type WithLastRewardNotification = {
  notification?: WheelRewardNotificationInput;
};
type WithSpinEligibility = { nextSpinAt?: Date };
export type WheelInput = Wheel &
  WithLastRewardNotification &
  WithWheelRewards &
  WithSpinEligibility;

export async function toWheelDto(input: WheelInput) {
  const plainRewardDto: WheelDto = {
    id: input.id,
    name: input.name,
    description: input.description,
    lastRewardNotification: ifDefined(
      input.notification,
      toWheelRewardNotificationDto,
    ),
    image: input.image ? getPublicUrl(input.image) : undefined,
    nextSpinAt: input.nextSpinAt,
    type: input.type,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    isActive: input.isActive,
    winProbability: input.winProbability,
    rewards: ifDefined(input.rewards, toRewardDtoArray),
  };

  return plainToInstance(RewardDto, plainRewardDto);
}
