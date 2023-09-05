import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateGlobalStatusDto } from './create-global-status.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateGlobalStatusDto extends PartialType(
  OmitType(CreateGlobalStatusDto, ['type'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isExpired?: boolean;
}
