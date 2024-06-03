import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  TransformStringToBoolean,
  TransformStringToNumber,
} from 'src/utils/transform';

export class CreateComicPageBodyDto {
  @IsPositive()
  @TransformStringToNumber()
  pageNumber: number;

  @IsBoolean()
  @TransformStringToBoolean()
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
