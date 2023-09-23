import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsUrl, Min } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ComicIssue, StatelessCover } from '@prisma/client';
import { findDefaultCover } from 'src/utils/comic-issue';

export class OwnedComicIssueDto {
  @IsPositive()
  id: number;

  @IsPositive()
  number: number;

  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsKebabCase()
  slug: string;

  @IsUrl()
  cover: string;

  @IsInt()
  @Min(0)
  ownedCopiesCount: number;
}

export type OwnedComicIssueInput = ComicIssue & {
  ownedCopiesCount: number;
  statelessCovers?: StatelessCover[];
};

export async function toOwnedComicIssueDto(issue: OwnedComicIssueInput) {
  const plainComicIssueDto: OwnedComicIssueDto = {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    slug: issue.slug,
    cover: getPublicUrl(findDefaultCover(issue.statelessCovers).image) || '',
    ownedCopiesCount: issue.ownedCopiesCount,
  };

  const issueDto = plainToInstance(OwnedComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toOwnedComicIssueDtoArray = (issues: OwnedComicIssueInput[]) => {
  return Promise.all(issues.map(toOwnedComicIssueDto));
};
