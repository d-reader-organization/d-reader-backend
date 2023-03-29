import { IsNumber, Min } from 'class-validator';
import { CollectionStats } from '../utils/types';
import { plainToInstance } from 'class-transformer';

export class CollectionStatsDto {
  @IsNumber()
  @Min(0)
  totalVolume: number;

  @IsNumber()
  @Min(0)
  itemsListed: number;

  @IsNumber()
  @Min(0)
  floorPrice: number;
}

export async function toCollectionStats(stats: CollectionStats) {
  const collectionStats: CollectionStatsDto = {
    totalVolume: stats.totalVolume ?? 0,
    itemsListed: stats.itemsListed ?? 0,
    floorPrice: stats.floorPrice ?? 0,
  };
  return plainToInstance(CollectionStatsDto, collectionStats);
}
