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
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import {
  ComicIssueStatsDto,
  toComicIssueStatsDto,
} from './comic-issue-stats.dto';
import { ComicIssueStats } from 'src/comic/types/comic-issue-stats';
import { toUserComicIssueDto, UserComicIssueDto } from './user-comic-issue.dto';
import { ApiProperty } from '@nestjs/swagger';
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
import { divide } from 'lodash';
import {
  ComicIssueCollaboratorDto,
  toComicIssueCollaboratorDtoArray,
} from './comic-issue-collaborator.dto';
import {
  StatelessCoverDto,
  toStatelessCoverDtoArray,
} from './covers/stateless-cover.dto';
import { findDefaultCover } from 'src/utils/comic-issue';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import {
  PartialCreatorDto,
  toPartialCreatorDto,
} from 'src/creator/dto/partial-creator.dto';
import {
  PartialGenreDto,
  toPartialGenreDtoArray,
} from 'src/genre/dto/partial-genre.dto';
import {
  PartialComicDto,
  toPartialComicDto,
} from 'src/comic/dto/partial-comic.dto';
import { ifDefined } from 'src/utils/lodash';
import { With } from 'src/types/shared';

export class ComicIssueDto {
  @IsPositive()
  id: number;

  @IsPositive()
  number: number;

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
  isFreeToRead: boolean;

  @IsBoolean()
  isFullyUploaded: boolean;

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

  @IsBoolean()
  isSecondarySaleActive: boolean;

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
  activeCandyMachineAddress?: string;

  @IsSolanaAddress()
  creatorAddress: string;

  @IsOptional()
  @IsArray()
  @Type(() => ComicIssueCollaboratorDto)
  @ApiProperty({ type: [ComicIssueCollaboratorDto] })
  collaborators?: ComicIssueCollaboratorDto[];

  // @IsOptional()
  // @IsArray()
  // @Type(() => StatefulCoverDto)
  // @ApiProperty({ type: [StatefulCoverDto] })
  // statefulCovers?: StatefulCoverDto[];

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

type WithComic = { comic?: Comic & { creator?: Creator; genres?: Genre[] } };
type WithGenres = { genres?: Genre[] };
type WithStats = { stats?: ComicIssueStats };
type WithMyStats = { myStats?: UserComicIssue & { canRead: boolean } };
type WithActiveCandyMachineAddress = { activeCandyMachineAddress?: string };
type WithCollaborators = { collaborators?: ComicIssueCollaborator[] };
type WithStatelessCovers = { statelessCovers?: StatelessCover[] };
type WithStatefulCovers = { statefulCovers?: StatefulCover[] };

export type ComicIssueInput = With<
  [
    ComicIssue,
    WithComic,
    WithGenres,
    WithStats,
    WithMyStats,
    WithActiveCandyMachineAddress,
    WithCollaborators,
    WithStatelessCovers,
    WithStatefulCovers,
  ]
>;

export function toComicIssueDto(issue: ComicIssueInput) {
  const genres = issue.genres || issue.comic?.genres;
  const collaborators = issue.collaborators;

  const plainComicIssueDto: ComicIssueDto = {
    id: issue.id,
    comicSlug: issue.comicSlug,
    number: issue.number,
    sellerFee: divide(issue.sellerFeeBasisPoints, 100),
    title: issue.title,
    slug: issue.slug,
    description: issue.description,
    flavorText: issue.flavorText,
    signature: getPublicUrl(issue.signature),
    cover: getPublicUrl(findDefaultCover(issue.statelessCovers)?.image) || '',
    releaseDate: issue.releaseDate.toISOString(),
    activeCandyMachineAddress: issue.activeCandyMachineAddress,
    isSecondarySaleActive: issue.isSecondarySaleActive,
    isFreeToRead: issue.isFreeToRead,
    isFullyUploaded: issue.isFullyUploaded,
    isPublished: !!issue.publishedAt,
    isPopular: !!issue.popularizedAt,
    isDeleted: !!issue.deletedAt,
    isVerified: !!issue.verifiedAt,
    creatorAddress: issue.creatorAddress,
    creator: ifDefined(issue.comic?.creator, toPartialCreatorDto),
    comic: ifDefined(issue.comic, toPartialComicDto),
    genres: ifDefined(genres, toPartialGenreDtoArray),
    collaborators: ifDefined(collaborators, toComicIssueCollaboratorDtoArray),
    // statefulCovers: ifDefined(issue.statefulCovers, toStatefulCoverDtoArray),
    statelessCovers: toStatelessCoverDtoArray(issue.statelessCovers),
    // royaltyWallets: ifDefined(issue.royaltyWallets, toRoyaltyWalletsDtoArray),
    stats: ifDefined(issue.stats, toComicIssueStatsDto),
    myStats: ifDefined(issue.myStats, toUserComicIssueDto),
  };

  const issueDto = plainToInstance(ComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toComicIssueDtoArray = (issues: ComicIssueInput[]) => {
  return issues.map(toComicIssueDto);
};
