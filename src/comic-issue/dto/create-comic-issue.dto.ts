import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { kebabCase } from 'lodash';
import { ComicIssueCollaboratorDto } from './comic-issue-collaborator.dto';
import { RoyaltyWalletDto } from './royalty-wallet.dto';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { IsLamport } from '../../decorators/IsLamport';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class CreateComicIssueBodyDto {
  @IsNotEmpty()
  @MaxLength(48)
  title: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.title))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  number: number;

  @Min(0)
  // @IsDivisibleBy(100)
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  supply: number;

  @IsLamport()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  discountMintPrice: number;

  @IsLamport()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  mintPrice: number;

  @Min(0)
  @Max(1)
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  sellerFee: number;

  @IsOptional()
  @MaxLength(256)
  description?: string;

  @IsOptional()
  @MaxLength(128)
  flavorText?: string;

  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  releaseDate: string;

  @IsKebabCase()
  comicSlug: string;

  @IsOptional()
  @IsSolanaAddress()
  creatorAddress?: string;

  // TODO: revise this
  // @IsArray()
  @Type(() => ComicIssueCollaboratorDto)
  @ApiProperty({ type: [ComicIssueCollaboratorDto] })
  @Transform(({ value }) => JSON.parse(value))
  collaborators: ComicIssueCollaboratorDto[];

  @IsArray()
  @Type(() => RoyaltyWalletDto)
  @ApiProperty({ type: [RoyaltyWalletDto] })
  @IsOptional()
  royaltyWallets?: RoyaltyWalletDto[];
}

export class CreateComicIssueFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  signature?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  pdf?: Express.Multer.File | null;
}

export class CreateComicIssueDto extends IntersectionType(
  CreateComicIssueBodyDto,
  CreateComicIssueFilesDto,
) {}
