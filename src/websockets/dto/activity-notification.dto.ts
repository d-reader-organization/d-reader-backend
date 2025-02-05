import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsDate, IsEnum, IsString } from 'class-validator';
import { getPublicUrl } from '../../aws/s3client';
import { BasicUserDto, toBasicUserDto } from '../../user/dto/basic-user-dto';
import {
  constructActivityNotificationMessage,
  getAdminActivityNotificationS3Folder,
} from '../../utils/websockets';

export enum ActivityType {
  RateComic = 'rated comic',
  LikeComic = 'liked comic',
  BookmarkComic = 'bookmarked comic',
  LikeComicIssue = 'liked comic issue',
  RateComicIssue = 'rated comic issue',
  FollowCreator = 'followed creator',
  SpinWheel = 'spun wheel',
  MintCollectible = 'minted collectible',
}

export class ActivityNotificationDto {
  @Type(() => BasicUserDto)
  user: BasicUserDto;

  @IsString()
  icon: string;

  @IsString()
  message: string;

  @IsDate()
  createdAt: Date;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type: ActivityType;
}

export type ActivityNotificationInput = {
  user: User;
  type: ActivityType;
};

export function toActivityNotificationDto(input: ActivityNotificationInput) {
  const type = input.type;
  const icon = getAdminActivityNotificationS3Folder(type, 'icon');
  const message = constructActivityNotificationMessage(type);

  const plainActivityNotificationDto: ActivityNotificationDto = {
    user: toBasicUserDto(input.user),
    type,
    createdAt: new Date(),
    icon: getPublicUrl(icon),
    message,
  };

  const activityNotificationDto: ActivityNotificationDto = plainToInstance(
    ActivityNotificationDto,
    plainActivityNotificationDto,
  );
  return activityNotificationDto;
}
