import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TransformDateStringToDate } from '../../utils/transform';
import { kebabCase } from 'lodash';
import { IsKebabCase } from '../../decorators/IsKebabCase';

export class CreateCampaignDto {
  @IsNotEmpty()
  @MaxLength(48)
  title: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => obj.title && kebabCase(obj.title))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsNumber()
  raiseGoal: number;

  @IsOptional()
  @TransformDateStringToDate()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @TransformDateStringToDate()
  @IsDate()
  endDate?: Date;
}
