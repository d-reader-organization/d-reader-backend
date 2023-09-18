import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { IsLamport } from 'src/decorators/IsLamport';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { TransformStringToNumber } from 'src/utils/transform';

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
  @TransformStringToNumber()
  number: number;

  @IsKebabCase()
  comicSlug: string;

  @IsBoolean()
  isFreeToRead: boolean;

  @IsBoolean()
  @IsOptional()
  isFullyUploaded?: boolean;

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
  @IsSolanaAddress()
  creatorBackupAddress?: string;

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
