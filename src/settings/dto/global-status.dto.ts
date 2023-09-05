import { ApiProperty } from '@nestjs/swagger';
import { GlobalStatusType, GlobalStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsString } from 'class-validator';

export class GlobalStatusDto {
  @IsEnum(GlobalStatusType)
  @ApiProperty({ enum: GlobalStatusType })
  type: GlobalStatusType;

  @IsString()
  message: string;
}

export const toGlobalStatus = (status: GlobalStatus): GlobalStatusDto => {
  const plainGlobalStatusDto = {
    type: status.type,
    message: status.message,
  };
  return plainToInstance(GlobalStatusDto, plainGlobalStatusDto);
};

export const toGlobalStatusArray = (statusArray: GlobalStatus[]) => {
  return statusArray.map(toGlobalStatus);
};
