import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransformDateStringToDate } from '../../utils/transform';
import { WhiteListType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

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

  @IsEnum(WhiteListType)
  @ApiProperty({ enum: WhiteListType })
  whiteListType: WhiteListType;
}
