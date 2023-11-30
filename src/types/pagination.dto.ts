import { ApiProperty } from '@nestjs/swagger';
import { Min } from 'class-validator';
import { TransformStringToNumber } from '../utils/transform';
import { IsIntRange } from '../decorators/IsIntRange';

export class Pagination {
  @Min(0)
  @TransformStringToNumber()
  @ApiProperty({ default: 0 })
  skip: number;

  @IsIntRange(1, 20)
  @TransformStringToNumber()
  @ApiProperty({ default: 20 })
  take: number;
}
