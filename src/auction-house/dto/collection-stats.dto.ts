import { IsInt, Min } from 'class-validator';
import { CollectonMarketplaceStats } from './types/collection-marketplace-stats';
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

  @IsInt()
  @Min(0)
  supply: number;
}

export function toCollectionStats(stats: CollectonMarketplaceStats) {
  const collectionStats: CollectionStatsDto = {
    totalVolume: stats.totalVolume,
    itemsListed: stats.itemsListed,
    floorPrice: stats.floorPrice,
    supply: stats.supply,
  };
  return plainToInstance(CollectionStatsDto, collectionStats);
}
