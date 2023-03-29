import { IsInt, Min } from 'class-validator';
import { CollectionStats } from './types';
import { plainToInstance } from 'class-transformer';

export class CollectionStatsDto {
  @IsInt()
  @Min(0)
  totalVolume: number;

  @IsInt()
  @Min(0)
  itemsListed: number;

  @IsInt()
  @Min(0)
  floorPrice: number;
}

export function toCollectionStats(stats: CollectionStats) {
  const collectionStats: CollectionStatsDto = {
    totalVolume: stats.totalVolume,
    itemsListed: stats.itemsListed,
    floorPrice: stats.floorPrice,
  };
  return plainToInstance(CollectionStatsDto, collectionStats);
}
