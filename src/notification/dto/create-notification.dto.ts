import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  body: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
