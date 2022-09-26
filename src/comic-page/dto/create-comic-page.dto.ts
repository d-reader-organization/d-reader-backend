import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsPositive } from 'class-validator';
import { ComicPageDto } from '../entities/comic-page.dto';

export class CreateComicPageDto {
  @Expose()
  @IsPositive()
  pageNumber: number;

  @Expose()
  @IsBoolean()
  isPreviewable: boolean;
  @Expose()
  @IsPositive()
  comicIssueId: number;

  @Expose()
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File;

  @Expose()
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  altImage?: Express.Multer.File | null;
}
