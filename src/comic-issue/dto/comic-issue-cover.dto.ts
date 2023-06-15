import { IsNumber, IsString } from 'class-validator';
import {
  CreateStatefulCoverDto,
  CreateStatelessCoverDto,
} from './create-comic-covers.dto';
import { IntersectionType, OmitType } from '@nestjs/swagger';

export class StatefulCoverDto extends IntersectionType(
  OmitType(CreateStatefulCoverDto, ['cover'] as const),
) {
  @IsNumber()
  id: number;

  @IsString()
  image: string;
}

export class StatelessCoverDto extends IntersectionType(
  OmitType(CreateStatelessCoverDto, ['cover'] as const),
) {
  @IsNumber()
  id: number;

  @IsString()
  image: string;
}
