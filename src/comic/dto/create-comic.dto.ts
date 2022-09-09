import { PickType } from '@nestjs/swagger';
import { Comic } from '../entities/comic.entity';

// TODO: thumbnail and soundtrack should be files
// TODO: Connect with pages as well
export class CreateComicDto extends PickType(Comic, [
  'title',
  'flavorText',
  'description',
  'thumbnail',
  'issueNumber',
  'releaseDate',
  'collectionName',
  'soundtrack',
]) {}
