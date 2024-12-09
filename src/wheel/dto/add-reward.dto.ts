import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { WheelRewardType } from '@prisma/client';
import { TransformNumberToString } from 'src/utils/transform';

export class AddRewardDto {
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
}
