import { plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { getCachedReadUrl } from 'src/aws/s3client';
import { ComicDto } from 'src/comic/dto/comic.dto';
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ComicIssueStatsDto } from './comic-issue-stats.dto';
import { ComicIssueStats } from 'src/comic/types/comic-issue-stats';
import { WalletComicIssueDto } from './wallet-comic-issue.dto';
import { PickType } from '@nestjs/swagger';
import {
  ComicIssue,
  Creator,
  Comic,
  ComicPage,
  WalletComicIssue,
} from '@prisma/client';
import { divide, round } from 'lodash';
import { IsLamport } from 'src/decorators/IsLamport';

class PartialComicDto extends PickType(ComicDto, [
  'name',
  'slug',
  'audienceType',
]) {}
class PartialCreatorDto extends PickType(CreatorDto, [
  'name',
  'slug',
  'isVerified',
  'avatar',
]) {}

export class ComicIssueDto {
  @IsPositive()
  id: number;

  @IsPositive()
  number: number;

  @Min(0)
  supply: number;

  @IsLamport()
  discountMintPrice: number;

  @IsLamport()
  mintPrice: number;

  @Min(0)
  @Max(1)
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

  @IsUrl()
  cover: string;

  // @IsUrl()
  // signedCover: string;

  // @IsUrl()
  // usedCover: string;

  // @IsUrl()
  // usedSignedCover: string;

  @IsDateString()
  releaseDate: string;

  @IsBoolean()
  isFree: boolean;

  @IsBoolean()
  isPublished: boolean;

  @IsBoolean()
  isPopular: boolean;

  @IsBoolean()
  isDeleted: boolean;

  @IsBoolean()
  isVerified: boolean;

  @IsOptional()
  @Type(() => PartialCreatorDto)
  creator?: PartialCreatorDto;

  @IsOptional()
  @Type(() => PartialComicDto)
  comic?: PartialComicDto;

  @IsOptional()
  @Type(() => ComicIssueStatsDto)
  stats?: ComicIssueStatsDto;

  @IsOptional()
  @Type(() => WalletComicIssueDto)
  myStats?: WalletComicIssueDto;

  @IsOptional()
  @IsString()
  candyMachineAddress?: string;
}

type ComicIssueInput = ComicIssue & {
  comic?: Comic & { creator?: Creator };
  pages?: ComicPage[];
  stats?: ComicIssueStats;
  myStats?: WalletComicIssue & { canRead: boolean };
  candyMachineAddress?: string;
};

export async function toComicIssueDto(issue: ComicIssueInput) {
  const plainComicIssueDto: ComicIssueDto = {
    id: issue.id,
    number: issue.number,
    supply: issue.supply,
    discountMintPrice: issue.discountMintPrice,
    mintPrice: issue.mintPrice,
    sellerFee: divide(issue.sellerFeeBasisPoints, 100),
    title: issue.title,
    slug: issue.slug,
    description: issue.description,
    flavorText: issue.flavorText,
    cover: await getCachedReadUrl(issue.cover),
    // signedCover: await getCachedReadUrl(issue.signedCover),
    // usedCover: await getCachedReadUrl(issue.usedCover),
    // usedSignedCover: await getCachedReadUrl(issue.usedSignedCover),
    releaseDate: issue.releaseDate.toISOString(),
    // if supply is 0 it's not an NFT collection and therefore it's free
    isFree: issue.supply === 0,
    isPublished: !!issue.publishedAt,
    isPopular: !!issue.popularizedAt,
    isDeleted: !!issue.deletedAt,
    isVerified: !!issue.verifiedAt,
    creator: issue?.comic?.creator
      ? {
          name: issue.comic.creator.name,
          slug: issue.comic.creator.slug,
          isVerified: !!issue.comic.creator.verifiedAt,
          avatar: await getCachedReadUrl(issue.comic.creator.avatar),
        }
      : undefined,
    comic: issue?.comic
      ? {
          name: issue.comic.name,
          slug: issue.comic.slug,
          audienceType: issue.comic.audienceType,
        }
      : undefined,
    stats: issue?.stats
      ? {
          favouritesCount: issue.stats.favouritesCount,
          ratersCount: issue.stats.ratersCount,
          averageRating: round(issue.stats.averageRating, 1),
          price: issue.stats.price,
          totalIssuesCount: issue.stats.totalIssuesCount,
          readersCount: issue.stats.readersCount,
          viewersCount: issue.stats.viewersCount,
          totalPagesCount: issue.stats.totalPagesCount,
        }
      : undefined,
    myStats: issue.myStats
      ? {
          rating: issue.myStats.rating,
          isFavourite: issue.myStats.isFavourite,
          canRead: issue.myStats.canRead,
          readAt: issue.myStats.readAt,
          viewedAt: issue.myStats.viewedAt,
        }
      : undefined,
    candyMachineAddress: issue.candyMachineAddress ?? undefined,
  };

  const issueDto = plainToInstance(ComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toComicIssueDtoArray = (issues: ComicIssueInput[]) => {
  return Promise.all(issues.map(toComicIssueDto));
};
