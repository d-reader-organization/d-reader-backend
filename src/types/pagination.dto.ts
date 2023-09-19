import { ApiProperty } from '@nestjs/swagger';
import { Max, Min } from 'class-validator';
import { TransformStringToNumber } from '../utils/transform';

export class Pagination {
  @Min(0)
  @TransformStringToNumber()
  @ApiProperty({ default: 0 })
  skip: number;

  @Min(1)
  @Max(20)
  @TransformStringToNumber()
  @ApiProperty({ default: 20 })
  take: number;
}
