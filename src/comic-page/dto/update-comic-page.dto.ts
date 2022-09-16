import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateComicPageDto } from './create-comic-page.dto';

export class UpdateComicPageDto extends PartialType(CreateComicPageDto) {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  image: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  altImage: Express.Multer.File | null;
}
