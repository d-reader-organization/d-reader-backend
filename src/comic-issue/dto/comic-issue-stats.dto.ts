import { plainToInstance } from 'class-transformer';
import { IsOptional, Min } from 'class-validator';
import { ComicIssueStats } from '../../comic/dto/types';
import { IsNumberRange } from '../../decorators/IsNumberRange';
import { round } from 'lodash';

export class ComicIssueStatsDto {
  @Min(0)
  favouritesCount: number;

  // @Min(0)
  // subscribersCount: number;

  @Min(0)
  ratersCount: number;

  @IsNumberRange(1, 5)
  @IsOptional()
  averageRating: number | null;

  @Min(0)
  @IsOptional()
  price?: number | null;

  @Min(0)
  totalIssuesCount: number;

  @Min(0)
  previewPagesCount: number;

  @Min(0)
  readersCount: number;

  @Min(0)
  viewersCount: number;

  @Min(0)
  totalPagesCount: number;
}

export function toComicIssueStatsDto(stats: Partial<ComicIssueStats>) {
  const plainStatsDto: ComicIssueStatsDto = {
    previewPagesCount: stats.previewPagesCount,
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
