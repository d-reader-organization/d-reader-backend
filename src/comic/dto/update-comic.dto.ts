import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateComicDto } from './create-comic.dto';

export class UpdateComicDto extends PartialType(
  OmitType(CreateComicDto, ['title', 'slug'] as const),
) {}
