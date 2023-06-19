import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateComicPageBodyDto {
  @IsPositive()
  pageNumber: number;

  @IsBoolean()
  isPreviewable: boolean;
}

export class CreateComicPageFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;
}

export class CreateComicPageDto extends IntersectionType(
  CreateComicPageBodyDto,
  CreateComicPageFilesDto,
) {}
