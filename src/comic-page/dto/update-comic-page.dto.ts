import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { CreateComicPageDto } from './create-comic-page.dto';

export class UpdateComicPageDto extends PartialType(
  OmitType(CreateComicPageDto, ['comicIssueId'] as const),
) {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  image: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary' })
  altImage: Express.Multer.File | null;
}
