import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { WheelRewardType } from '@prisma/client';
import { TransformNumberToString } from 'src/utils/transform';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { AddDropDto } from './add-drops.dto';

export class AddRewardBodyDto {
  @IsNotEmpty()
  @MaxLength(48)
  name: string;

  @IsOptional()
  @MaxLength(1024)
  description?: string;

  @TransformNumberToString()
  @IsString()
  typeId: string;

  @IsEnum(WheelRewardType)
  type: WheelRewardType;

  @IsNumber()
  supply: number;

  @IsNumber()
  weight: number;

  @IsOptional()
  @IsString()
  externalLink?: string;

  @IsNumber()
  winProbability: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddDropDto)
  drops: AddDropDto[];
}

export class AddRewardFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;
}

export class AddRewardDto extends IntersectionType(
  AddRewardBodyDto,
  AddRewardFilesDto,
) {}