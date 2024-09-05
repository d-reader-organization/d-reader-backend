import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsPositive,
  IsString,
} from 'class-validator';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ComicIssue } from '@prisma/client';
import { divide } from 'lodash';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { IsNumberRange } from '../../decorators/IsNumberRange';

export class BasicComicIssueDto {
  @IsPositive()
  id: number;

  @IsPositive()
  number: number;

  @IsNumberRange(0, 1)
  sellerFee: number;

  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsKebabCase()
  slug: string;

  @IsString()
  description: string;

  @IsString()
  flavorText: string;

  @IsDateString()
  releaseDate: string;

  @IsBoolean()
  isFreeToRead: boolean;

  @IsBoolean()
  isFullyUploaded: boolean;

  @IsBoolean()
  isPublished: boolean;

  @IsBoolean()
  isPopular: boolean;

  @IsBoolean()
  isVerified: boolean;

  @IsNotEmpty()
  @IsKebabCase()
  comicSlug: string;

  @IsBoolean()
  isSecondarySaleActive: boolean;

  @IsSolanaAddress()
  creatorAddress: string;
}

export function toBasicComicIssueDto(issue: ComicIssue) {
  const plainComicIssueDto: BasicComicIssueDto = {
    id: issue.id,
    comicSlug: issue.comicSlug,
    number: issue.number,
    sellerFee: divide(issue.sellerFeeBasisPoints, 100),
    title: issue.title,
    slug: issue.slug,
    description: issue.description,
    flavorText: issue.flavorText,
    releaseDate: issue.releaseDate.toISOString(),
    isSecondarySaleActive: issue.isSecondarySaleActive,
    isFreeToRead: issue.isFreeToRead,
    isFullyUploaded: issue.isFullyUploaded,
    isPublished: !!issue.publishedAt,
    isPopular: !!issue.popularizedAt,
    isVerified: !!issue.verifiedAt,
    creatorAddress: issue.creatorAddress,
  };

  const issueDto = plainToInstance(BasicComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toBasicComicIssueDtoArray = (issues: ComicIssue[]) => {
  return issues.map(toBasicComicIssueDto);
};
