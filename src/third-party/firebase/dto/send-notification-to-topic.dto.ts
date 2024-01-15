import { Type } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { NotificationDto } from 'src/notification/dto/notification.dto';
import { TopicName } from '../types';

export class SendMessageToTopicDto {
  @Type(() => NotificationDto)
  notification: NotificationDto;

  @IsEnum(TopicName)
  topic: TopicName;
}
