import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateGlobalStatusDto } from './create-global-status.dto';
import { IsBooleanString } from 'class-validator';

export class UpdateGlobalStatusDto extends PartialType(
  OmitType(CreateGlobalStatusDto, ['type'] as const),
) {
  @IsBooleanString()
  isExpired: boolean;
}
