import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { Transform } from 'class-transformer';
import {
  TransformStringToBoolean,
  TransformStringToNumber,
} from '../../utils/transform';
import { SortOrder } from '../../types/sort-order';
import { ComicRarity } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export enum ListingSortTag {
  Rarity = 'rarity',
  Price = 'price',
}

export class ListingFilterParams extends Pagination {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value == 'string') return value.toLocaleLowerCase() == 'true';
    else return value;
  })
  isSold?: boolean;

  @Min(0)
  @TransformStringToNumber()
  @IsNumber()
  comicIssueId: number;

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

  @IsEnum(ListingSortTag)
  @IsOptional()
  sortTag?: ListingSortTag;
}
