import { ApiProperty } from '@nestjs/swagger';
import { GlobalStatusType } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class CreateGlobalStatusDto {
  @IsEnum(GlobalStatusType)
  @ApiProperty({ enum: GlobalStatusType })
  type: GlobalStatusType;

  @IsString()
  message: string;
}
