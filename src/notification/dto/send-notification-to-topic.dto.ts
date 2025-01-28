import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { NotificationDto } from 'src/notification/dto/notification.dto';
import { TopicName } from '../types';
import { IsNotificationData } from 'src/decorators/IsNotificationData';
import { DataMessagePayload } from 'firebase-admin/lib/messaging/messaging-api';
import { Param } from '@discord-nestjs/core';

export class PushNotificationDiscordDto {
  @Param({ description: 'Body of the push notification', required: true })
  body: string;

  @Param({ description: 'Title of the push notification', required: true })
  title: string;

  @Param({
    description:
      'comicSlug:pall-o, comicIssueId:2, externalUrl:url, creatorId:id',
    required: true,
  })
  data: string;
}

export class SendMessageToTopicDto {
  @Type(() => NotificationDto)
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  notification: NotificationDto;

  @IsEnum(TopicName)
  topic: TopicName;

  @IsOptional()
  @IsObject()
  @IsNotificationData()
  data?: DataMessagePayload;
}
