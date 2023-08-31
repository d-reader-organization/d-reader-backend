import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
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
import { getPublicUrl } from 'src/aws/s3client';
import { ComicDto } from 'src/comic/dto/comic.dto';
import { CreatorDto } from 'src/creator/dto/creator.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ComicIssueStatsDto } from './comic-issue-stats.dto';
import { ComicIssueStats } from 'src/comic/types/comic-issue-stats';
import { UserComicIssueDto } from './user-comic-issue.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  ComicIssue,
  Creator,
  Comic,
  UserComicIssue,
  ComicIssueCollaborator,
  StatelessCover,
  StatefulCover,
  Genre,
} from '@prisma/client';
import { divide, round } from 'lodash';
import { IsLamport } from 'src/decorators/IsLamport';
import { ComicIssueCollaboratorDto } from './comic-issue-collaborator.dto';
import {
  StatelessCoverDto,
  toStatelessCoverDtoArray,
} from './covers/stateless-cover.dto';
import { StatefulCoverDto } from './covers/stateful-cover.dto';
import { findDefaultCover } from 'src/utils/comic-issue';
import { GenreDto, toPartialGenreDtoArray } from 'src/genre/dto/genre.dto';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

class PartialComicDto extends PickType(ComicDto, [
  'title',
  'slug',
  'audienceType',
]) {}
class PartialCreatorDto extends PickType(CreatorDto, [
  'name',
  'slug',
  'isVerified',
  'avatar',
]) {}
class PartialGenreDto extends PickType(GenreDto, [
  'name',
  'slug',
  'color',
  'icon',
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

  @IsUrl()
  signature: string;

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

  @IsNotEmpty()
  @IsKebabCase()
  comicSlug: string;

  @IsOptional()
  @Type(() => PartialCreatorDto)
  creator?: PartialCreatorDto;

  @IsOptional()
  @Type(() => PartialComicDto)
  comic?: PartialComicDto;

  @IsOptional()
  @IsArray()
  @Type(() => PartialGenreDto)
  genres?: PartialGenreDto[];

  @IsOptional()
  @Type(() => ComicIssueStatsDto)
  stats?: ComicIssueStatsDto;

  @IsOptional()
  @Type(() => UserComicIssueDto)
  myStats?: UserComicIssueDto;

  @IsOptional()
  @IsString()
  candyMachineAddress?: string;

  @IsSolanaAddress()
  creatorAddress: string;

  @IsOptional()
  @IsArray()
  @Type(() => ComicIssueCollaboratorDto)
  @ApiProperty({ type: [ComicIssueCollaboratorDto] })
  collaborators?: ComicIssueCollaboratorDto[];

  @IsOptional()
  @IsArray()
  @Type(() => StatefulCoverDto)
  @ApiProperty({ type: [StatefulCoverDto] })
  statefulCovers?: StatefulCoverDto[];

  @IsOptional()
  @IsArray()
  @Type(() => StatelessCoverDto)
  @ApiProperty({ type: [StatelessCoverDto] })
  statelessCovers?: StatelessCoverDto[];

  // @IsArray()
  // @Type(() => RoyaltyWalletDto)
  // @ApiProperty({ type: [RoyaltyWalletDto] })
  // royaltyWallets: RoyaltyWalletDto[];
}

export type ComicIssueInput = ComicIssue & {
  comic?: Comic & { creator?: Creator; genres?: Genre[] };
  stats?: ComicIssueStats;
  myStats?: UserComicIssue & { canRead: boolean };
  candyMachineAddress?: string;
  collaborators?: ComicIssueCollaborator[];
  statelessCovers?: StatelessCover[];
  statefulCovers?: StatefulCover[];
  genres?: Genre[];
};

export function toComicIssueDto(issue: ComicIssueInput) {
  const genres = issue.genres || issue.comic?.genres;

  const plainComicIssueDto: ComicIssueDto = {
    id: issue.id,
    comicSlug: issue.comicSlug,
    number: issue.number,
    supply: issue.supply,
    discountMintPrice: issue.discountMintPrice,
    mintPrice: issue.mintPrice,
    sellerFee: divide(issue.sellerFeeBasisPoints, 100),
    title: issue.title,
    slug: issue.slug,
    description: issue.description,
    flavorText: issue.flavorText,
    signature: getPublicUrl(issue.signature),
    cover: getPublicUrl(findDefaultCover(issue.statelessCovers)?.image) || '',
    releaseDate: issue.releaseDate.toISOString(),
    candyMachineAddress: issue.candyMachineAddress ?? undefined,
    // collaborators: issue.collaborators,
    // statefulCovers: toStatefulCoverDtoArray(issue.statefulCovers),
    statelessCovers: toStatelessCoverDtoArray(issue.statelessCovers),
    // if supply is 0 it's not an NFT collection and therefore it's free
    isFree: issue.supply === 0,
    isPublished: !!issue.publishedAt,
    isPopular: !!issue.popularizedAt,
    isDeleted: !!issue.deletedAt,
    isVerified: !!issue.verifiedAt,
    creatorAddress: issue.creatorAddress,
    creator: issue.comic?.creator
      ? {
          name: issue.comic.creator.name,
          slug: issue.comic.creator.slug,
          isVerified: !!issue.comic.creator.verifiedAt,
          avatar: getPublicUrl(issue.comic.creator.avatar),
        }
      : undefined,
    comic: issue.comic
      ? {
          title: issue.comic.title,
          slug: issue.comic.slug,
          audienceType: issue.comic.audienceType,
        }
      : undefined,
    genres: toPartialGenreDtoArray(genres),
    stats: issue.stats
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
  };

  const issueDto = plainToInstance(ComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toComicIssueDtoArray = (issues: ComicIssueInput[]) => {
  return issues.map(toComicIssueDto);
};
