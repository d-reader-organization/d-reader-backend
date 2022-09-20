import { ApiProperty, PickType } from '@nestjs/swagger';
import { ComicPageDto } from '../entities/comic-page.dto';

export class CreateComicPageDto extends PickType(ComicPageDto, [
  'pageNumber',
  'isPreviewable',
  'comicIssueId',
]) {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  image: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary' })
  altImage: Express.Multer.File | null;
}
