import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateGenreDto } from './create-genre.dto';

export class UpdateGenreDto extends PartialType(
  OmitType(CreateGenreDto, ['name', 'slug'] as const),
) {}
