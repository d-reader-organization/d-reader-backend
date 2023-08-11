import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateGenreBodyDto } from './create-genre.dto';

export class UpdateGenreDto extends PartialType(
  OmitType(CreateGenreBodyDto, ['name', 'slug'] as const),
) {}
