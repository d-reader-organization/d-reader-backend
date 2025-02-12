import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class PaginatedResponseDto<T> {
  @IsNumber()
  totalItems: number;

  @IsArray()
  @ApiProperty({ isArray: true })
  data: T[];
}
