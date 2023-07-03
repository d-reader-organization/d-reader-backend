import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { Pagination } from 'src/types/pagination.dto';

export class CreatorFilterParams extends Pagination {
  @IsOptional()
  @IsString()
  nameSubstring?: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({ type: String })
  @Type(() => String)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    } else return value;
  })
  genreSlugs?: string[];
}
