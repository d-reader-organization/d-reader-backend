import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateComicBodyDto } from './create-comic.dto';

export class UpdateComicDto extends PartialType(
  OmitType(CreateComicBodyDto, ['title', 'slug'] as const),
) {}
