import { IsString } from 'class-validator';

export class NotificationDto {
  @IsString()
  body: string;

  @IsString()
  title: string;
}
