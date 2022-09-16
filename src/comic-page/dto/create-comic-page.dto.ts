import { ApiProperty, PickType } from '@nestjs/swagger';
import { ComicPage } from '../entities/comic-page.entity';

export class CreateComicPageDto extends PickType(ComicPage, [
  'pageNumber',
  'chapterNumber',
  'isPreviewable',
  'comicId',
]) {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  image: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  altImage: Express.Multer.File | null;
}
