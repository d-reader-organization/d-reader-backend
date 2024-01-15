import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';
import { NotificationDto } from 'src/notification/dto/notification.dto';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageToDevicesDto {
  @Type(() => NotificationDto)
  notification: NotificationDto;

  @IsArray()
  @Type(() => String)
  @ApiProperty({ type: [String] })
  deviceIds: string[];
}
