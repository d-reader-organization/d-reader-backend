import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransformDateStringToDate } from '../../utils/transform';

export class AddGroupDto {
  @IsNumber()
  mintPrice: number;

  @IsString()
  displayLabel: string;

  @IsNumber()
  supply: number;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  splTokenAddress?: string;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  mintLimit?: number;

  @IsOptional()
  @IsNumber()
  freezePeriod?: number;

  @IsOptional()
  @IsBoolean()
  frozen?: boolean;
}
