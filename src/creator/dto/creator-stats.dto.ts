import { Optional } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Min } from 'class-validator';
import { CreatorStats } from 'src/comic/dto/types';

export class CreatorStatsDto {
  @Min(0)
  comicIssuesCount: number;

  @Min(0)
  totalVolume: number;

  @Min(0)
  followersCount: number;

  @Optional()
  @Min(0)
  comicsCount?: number;
}

export function toCreatorStatsDto(stats: Partial<CreatorStats>) {
  const plainStatsDto: CreatorStatsDto = {
    comicIssuesCount: stats.comicIssuesCount,
    totalVolume: stats.totalVolume,
    followersCount: stats.followersCount,
    comicsCount: stats.comicsCount,
  };

  const statsDto = plainToInstance(CreatorStatsDto, plainStatsDto);
  return statsDto;
}

export const toCreatorDtoArray = (statsArray: CreatorStats[]) => {
  return statsArray.map(toCreatorStatsDto);
};
