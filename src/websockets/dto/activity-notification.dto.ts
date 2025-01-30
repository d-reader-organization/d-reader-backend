import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { BasicUserDto, toBasicUserDto } from 'src/user/dto/basic-user-dto';
import { ifDefined } from 'src/utils/lodash';

export enum ActivityType {
  ComicRated = 'ComicRated',
  ComicLiked = 'ComicLiked',
  ComicBookmarked = 'ComicBookmarked',
  ComicIssueLiked = 'ComicIssueLiked',
  ComicIssueRated = 'ComicIssueRated',
  CollectibleComicMinted = 'CollectibleComicMinted',
  CreatorFollow = 'CreatorFollow',
  WheelSpun = 'WheelSpun',
}

export class ActivityNotificationDto {
  @IsOptional()
  @Type(() => BasicUserDto)
  user?: BasicUserDto;

  @IsString()
  targetId: string;

  @IsString()
  targetTitle: string;

  @IsDate()
  createdAt: Date;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type: ActivityType;
}

export type ActivityNotificationInput = {
  user?: User;
  targetId: string;
  targetTitle: string;
  type: ActivityType;
};

export function toActivityNotificationDto(input: ActivityNotificationInput) {
  const type = input.type;

  const plainActivityNotificationDto: ActivityNotificationDto = {
    user: ifDefined(input.user, toBasicUserDto),
    type,
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    createdAt: new Date(),
  };

  const activityNotificationDto: ActivityNotificationDto = plainToInstance(
    ActivityNotificationDto,
    plainActivityNotificationDto,
  );
  return activityNotificationDto;
}
