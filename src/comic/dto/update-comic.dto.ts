import { PartialType } from '@nestjs/swagger';
import { CreateComicDto } from './create-comic.dto';

export class UpdateComicDto extends PartialType(CreateComicDto) {}
