import { ApiProperty } from '@nestjs/swagger';
import { ComicRarity, SignatureRequestStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Pagination } from 'src/types/pagination.dto';
import { SortOrder } from 'src/types/sort-order';
import {
  TransformStringToBoolean,
  TransformStringToNumber,
} from 'src/utils/transform';

export class AutographRequestFilterParams extends Pagination {
  @IsEnum(SignatureRequestStatus)
  @ApiProperty({ enum: SignatureRequestStatus })
  status: SignatureRequestStatus;

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
