import { plainToInstance } from 'class-transformer';
import { Min } from 'class-validator';
import { CreatorStats } from 'src/comic/types/creator-stats';

export class CreatorStatsDto {
  @Min(0)
  comicIssuesCount: number;

  @Min(0)
  totalVolume: number;

  @Min(0)
  followersCount: number;
}

export function toCreatorStatsDto(stats: Partial<CreatorStats>) {
  const plainStatsDto: CreatorStatsDto = {
    comicIssuesCount: stats.comicIssuesCount,
    totalVolume: stats.totalVolume,
    followersCount: stats.followersCount,
  };

  const statsDto = plainToInstance(CreatorStatsDto, plainStatsDto);
  return statsDto;
}

export const toCreatorDtoArray = (statsArray: CreatorStats[]) => {
  return statsArray.map(toCreatorStatsDto);
};
