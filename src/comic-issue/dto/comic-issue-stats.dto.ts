import { plainToInstance } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';
import { round } from 'lodash';
import { ComicIssueStats } from 'src/comic/types/comic-issue-stats';

export class ComicIssueStatsDto {
  @Min(0)
  favouritesCount: number;

  // @Min(0)
  // subscribersCount: number;

  @Min(0)
  ratersCount: number;

  @Min(1)
  @Max(5)
  @IsOptional()
  averageRating: number | null;

  @Min(0)
  @IsOptional()
  price?: number | null;

  @Min(0)
  totalIssuesCount: number;

  @Min(0)
  readersCount: number;

  @Min(0)
  viewersCount: number;

  @Min(0)
  totalPagesCount: number;
}

export function toComicIssueStatsDto(stats: Partial<ComicIssueStats>) {
  const plainStatsDto: ComicIssueStatsDto = {
    favouritesCount: stats.favouritesCount,
    ratersCount: stats.ratersCount,
    averageRating: round(stats.averageRating, 1),
    price: stats.price,
    totalIssuesCount: stats.totalIssuesCount,
    readersCount: stats.readersCount,
    viewersCount: stats.viewersCount,
    totalPagesCount: stats.totalPagesCount,
  };

  const statsDto = plainToInstance(ComicIssueStatsDto, plainStatsDto);
  return statsDto;
}

export const toComicIssueDtoArray = (statsArray: ComicIssueStats[]) => {
  return statsArray.map(toComicIssueStatsDto);
};
