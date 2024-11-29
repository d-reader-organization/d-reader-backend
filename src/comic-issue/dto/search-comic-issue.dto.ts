import { plainToInstance } from 'class-transformer';
import { IsPositive, IsString, IsUrl } from 'class-validator';
import { getPublicUrl } from '../../aws/s3client';
import { SearchComicIssue } from './types';
import { findDefaultCover } from '../../utils/comic-issue';

export class SearchComicIssueDto {
  @IsPositive()
  id: number;

  @IsString()
  title: string;

  @IsPositive()
  number: number;

  @IsUrl()
  cover: string;
}

export function toSearchComicIssueDto(issue: SearchComicIssue) {
  const plainComicIssueDto: SearchComicIssueDto = {
    id: issue.id,
    title: issue.title,
    cover: getPublicUrl(findDefaultCover(issue.statelessCovers)?.image) || '',
    number: issue.number,
  };

  const comicIssueDto = plainToInstance(
    SearchComicIssueDto,
    plainComicIssueDto,
  );
  return comicIssueDto;
}

export const toSearchComicIssuesDtoArray = (issues: SearchComicIssue[]) => {
  return issues.map(toSearchComicIssueDto);
};
