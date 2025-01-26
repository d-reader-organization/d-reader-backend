import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsUrl,
  Min,
} from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ComicIssue, StatelessCover } from '@prisma/client';
import { findDefaultCover } from 'src/utils/comic-issue';
import {
  CollectibleComicDto,
  CollectibleComicInput,
  toCollectibleComicDtoArray,
} from '../../digital-asset/dto/collectible-comic.dto';

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

  @IsArray()
  @Type(() => CollectibleComicDto)
  collectibles: CollectibleComicDto[];

  @IsInt()
  @Min(0)
  ownedCopiesCount: number;
}

type WithStatelessCovers = { statelessCovers?: StatelessCover[] };
type WithCollectibles = { collectibles: CollectibleComicInput[] };

export type OwnedComicIssueInput = ComicIssue &
  WithCollectibles &
  WithStatelessCovers;

export async function toOwnedComicIssueDto(
  ownedComicIssueInput: OwnedComicIssueInput,
) {
  const { collectibles, statelessCovers, ...comicIssue } = ownedComicIssueInput;

  const plainComicIssueDto: OwnedComicIssueDto = {
    id: comicIssue.id,
    number: comicIssue.number,
    title: comicIssue.title,
    slug: comicIssue.slug,
    cover: getPublicUrl(findDefaultCover(statelessCovers).image) || '',
    collectibles: await toCollectibleComicDtoArray(collectibles),
    ownedCopiesCount: collectibles.length,
  };

  const issueDto = plainToInstance(OwnedComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toOwnedComicIssueDtoArray = (issues: OwnedComicIssueInput[]) => {
  return Promise.all(issues.map(toOwnedComicIssueDto));
};
