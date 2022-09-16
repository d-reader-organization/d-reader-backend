import { PartialType } from '@nestjs/swagger';
import { CreateComicDto, CreateComicFilesDto } from './create-comic.dto';

export class UpdateComicDto extends PartialType(CreateComicDto) {}

export class UpdateComicFilesDto extends PartialType(CreateComicFilesDto) {}
