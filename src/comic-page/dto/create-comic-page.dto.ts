import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { ComicPageDto } from '../entities/comic-page.dto';

export class CreateComicPageDto extends PickType(ComicPageDto, [
  'pageNumber',
  'isPreviewable',
  'comicIssueId',
]) {
  @Expose()
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File;

  @Expose()
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  altImage: Express.Multer.File | null;
}
