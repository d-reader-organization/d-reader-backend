import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
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

export class CreateComicIssueDto {
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

  @IsKebabCase()
  comicSlug: string;

  @IsOptional()
  @Min(0)
  // @IsDivisibleBy(100)
  @IsNumber()
  supply?: number;

  @IsOptional()
  @IsLamport()
  discountMintPrice?: number;

  @IsOptional()
  @IsLamport()
  mintPrice?: number;

  @IsOptional()
  @Min(0)
  @Max(1)
  @IsNumber()
  sellerFee?: number;

  @IsOptional()
  @MaxLength(256)
  description?: string;

  @IsOptional()
  @MaxLength(128)
  flavorText?: string;

  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  releaseDate: string;

  @IsOptional()
  @IsSolanaAddress()
  creatorAddress?: string;

  @IsOptional()
  @IsArray()
  @Type(() => ComicIssueCollaboratorDto)
  @ApiProperty({ type: [ComicIssueCollaboratorDto] })
  collaborators?: ComicIssueCollaboratorDto[];

  @IsOptional()
  @IsArray()
  @Type(() => RoyaltyWalletDto)
  @ApiProperty({ type: [RoyaltyWalletDto] })
  royaltyWallets?: RoyaltyWalletDto[];
}
