import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Max, Min } from 'class-validator';

export class Pagination {
  @Min(0)
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @ApiProperty({ default: 0 })
  skip: number;

  @Min(1)
  @Max(20)
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @ApiProperty({ default: 20 })
  take: number;
}
