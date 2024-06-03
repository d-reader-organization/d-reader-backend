import { IsInt, IsOptional, Min } from 'class-validator';
import { ComicStats } from '../types/comic-stats';
import { plainToInstance } from 'class-transformer';
import { IsNumberRange } from '../../decorators/IsNumberRange';
import { round } from 'lodash';

export class ComicStatsDto {
  @Min(0)
  @IsInt()
  favouritesCount: number;

  @Min(0)
  @IsInt()
  ratersCount: number;

  @IsNumberRange(1, 5)
  @IsOptional()
  averageRating: number | null;

  @Min(0)
  @IsInt()
  issuesCount: number;

  @Min(0)
  @IsInt()
  readersCount: number;

  @Min(0)
  @IsInt()
  viewersCount: number;
}

export function toComicStatsDto(stats: Partial<ComicStats>) {
  const plainStatsDto: ComicStatsDto = {
    favouritesCount: stats.favouritesCount,
    ratersCount: stats.ratersCount,
    averageRating: round(stats.averageRating),
    issuesCount: stats.issuesCount,
    readersCount: stats.readersCount,
    viewersCount: stats.viewersCount,
  };

  const statsDto = plainToInstance(ComicStatsDto, plainStatsDto);
  return statsDto;
}

export const toComicDtoArray = (statsArray: ComicStats[]) => {
  return statsArray.map(toComicStatsDto);
};
