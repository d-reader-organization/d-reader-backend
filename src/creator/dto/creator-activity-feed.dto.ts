import { ApiProperty } from '@nestjs/swagger';
import {
  ActivityTargetType,
  CreatorActivityFeed,
  CreatorActivityFeedType,
  CreatorChannel,
  User,
} from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { BasicUserDto, toBasicUserDto } from 'src/user/dto/basic-user-dto';
import { CreatorChannelDto, toCreatorDto } from './creator.dto';
import { ifDefined } from 'src/utils/lodash';

export class CreatorActivityFeedDto {
  @IsOptional()
  @Type(() => BasicUserDto)
  user?: BasicUserDto;

  @IsOptional()
  @Type(() => CreatorChannelDto)
  creator?: CreatorChannelDto;

  @IsString()
  targetId: string;

  @IsString()
  targetTitle: string;

  @IsDate()
  createdAt: Date;

  @ApiProperty({ enum: ActivityTargetType })
  @IsEnum(ActivityTargetType)
  targetType: ActivityTargetType;

  @ApiProperty({ enum: CreatorActivityFeedType })
  @IsEnum(CreatorActivityFeedType)
  type: CreatorActivityFeedType;
}

type WithUser = { user?: User };
type WithCreator = { creator?: CreatorChannel };
type WithActivityDetails = CreatorActivityFeed & { targetTitle: string };
export type CreatorActivityFeedInput = WithUser &
  WithCreator &
  WithActivityDetails;

export function toCreatorActivityFeedDto(input: CreatorActivityFeedInput) {
  const plainCreatorActivityDto: CreatorActivityFeedDto = {
    user: ifDefined(input.user, toBasicUserDto),
    type: input.type,
    targetType: input.targetType,
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    creator: ifDefined(input.creator, toCreatorDto),
    createdAt: new Date(),
  };

  const creatorActivityFeedDto: CreatorActivityFeedDto = plainToInstance(
    CreatorActivityFeedDto,
    plainCreatorActivityDto,
  );
  return creatorActivityFeedDto;
}

export function toCreatorActivityFeedDtoArray(
  inputs: CreatorActivityFeedInput[],
) {
  return inputs.map(toCreatorActivityFeedDto);
}
