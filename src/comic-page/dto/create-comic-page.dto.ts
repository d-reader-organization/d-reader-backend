import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsPositive } from 'class-validator';

export class CreateComicPageDto {
  @IsPositive()
  pageNumber: number;

  @IsBoolean()
  isPreviewable: boolean;

  @IsPositive()
  comicIssueId: number;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  altImage?: Express.Multer.File | null;
}
