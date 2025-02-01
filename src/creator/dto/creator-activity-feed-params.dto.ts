import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';
import { TransformStringToNumber } from 'src/utils/transform';
import { ActivityTargetType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreatorActivityFeedParams extends Pagination {
  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  creatorId?: number;

  @IsOptional()
  @ApiProperty({ enum: ActivityTargetType })
  @IsEnum(ActivityTargetType)
  targetType?: ActivityTargetType;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}
