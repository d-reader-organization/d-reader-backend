import { ApiProperty } from '@nestjs/swagger';
import { ComicRarity } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';
import {
  TransformStringToBoolean,
  TransformStringToNumber,
} from '../../utils/transform';

export enum SignatureRequestTab {
  Resolved = 'Resolved',
  Pending = 'Pending',
}

export class AutographRequestFilterParams extends Pagination {
  @IsEnum(SignatureRequestTab)
  @ApiProperty({ enum: SignatureRequestTab })
  status: SignatureRequestTab;

  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  creatorId?: number;

  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  comicIssueId?: number;

  @IsOptional()
  @IsString()
  comicSlug?: string;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  @IsOptional()
  rarity?: ComicRarity;

  @IsOptional()
  @IsBoolean()
  @TransformStringToBoolean()
  isUsed?: boolean;

  @IsOptional()
  @IsBoolean()
  @TransformStringToBoolean()
  isSigned?: boolean;
}
