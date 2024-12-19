import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';

export class RemoveDropsDto {
  @IsArray()
  @Type(() => Number)
  drops: number[];
}
