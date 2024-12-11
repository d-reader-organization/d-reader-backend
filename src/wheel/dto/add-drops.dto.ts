import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

export class AddDropDto {
  @IsString()
  itemId: string;

  @IsInt()
  amount: number;
}

export class AddDropsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddDropDto)
  drops: AddDropDto[];
}
