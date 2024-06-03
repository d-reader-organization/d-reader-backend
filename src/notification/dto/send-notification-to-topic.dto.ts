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
