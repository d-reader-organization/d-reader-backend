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
} from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { RewardDto, toRewardDtoArray } from './rewards.dto';
import { ifDefined } from 'src/utils/lodash';

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

  @IsEnum(WheelType)
  @ApiProperty({ enum: WheelType })
  type: WheelType;

  @IsDate()
  startsAt: Date;

  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @Type(() => RewardDto)
  rewards?: RewardDto[];

  @IsNumber()
  winProbability: number;

  @IsBoolean()
  isActive: boolean;
}

export type WheelInput = Wheel & { rewards?: WheelReward[] };

export async function toWheelDto(input: WheelInput) {
  const plainRewardDto: WheelDto = {
    id: input.id,
    name: input.name,
    description: input.description,
    image: input.image ? getPublicUrl(input.image) : undefined,
    type: input.type,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    isActive: input.isActive,
    winProbability: input.winProbability,
    rewards: ifDefined(input.rewards, toRewardDtoArray),
  };

  return plainToInstance(RewardDto, plainRewardDto);
}