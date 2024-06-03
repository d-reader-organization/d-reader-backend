import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { NotificationDto } from 'src/notification/dto/notification.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotificationData } from 'src/decorators/IsNotificationData';
import { DataMessagePayload } from 'firebase-admin/lib/messaging/messaging-api';

export class SendMessageToDevicesDto {
  @Type(() => NotificationDto)
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  notification: NotificationDto;

  @IsArray()
  @Type(() => String)
  @ApiProperty({ type: [String] })
  deviceIds: string[];

  @IsOptional()
  @IsObject()
  @IsNotificationData()
  data?: DataMessagePayload;
}
