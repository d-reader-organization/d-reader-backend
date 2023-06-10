import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Max,
  MaxLength,
  IsEnum,
  IsString,
  Min,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { kebabCase } from 'lodash';
import { CreateComicPageDto } from 'src/comic-page/dto/create-comic-page.dto';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { IsLamport } from 'src/decorators/IsLamport';
import { CollaboratorRole, ComicRarity } from '@prisma/client';

export class ComicIssueCollaboratorDto {
  @IsEnum(CollaboratorRole)
  @ApiProperty({ enum: CollaboratorRole })
  role: CollaboratorRole;

  @IsString()
  name: string;
}

export class CreateComicIssueDto {
  @IsNotEmpty()
  @MaxLength(48)
  title: string;

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

  @IsArray()
  @Type(() => CreateComicPageDto)
  @ApiProperty({ type: [CreateComicPageDto] })
  pages: CreateComicPageDto[];

  @IsArray()
  @Type(() => ComicIssueCollaboratorDto)
  @ApiProperty({ type: [ComicIssueCollaboratorDto] })
  collaborators: ComicIssueCollaboratorDto[];
}

export class StatelessCover {
  @IsString()
  artist: string;
  image: Express.Multer.File | null;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity: ComicRarity;

  @IsOptional()
  @IsInt()
  share: number;
}

export class StatefulCover {
  @IsString()
  artist: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;

  @IsBoolean()
  isSigned: boolean;

  @IsBoolean()
  isUsed: boolean;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity?: ComicRarity;
}

export class CreateComicIssueFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  cover?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  signature?: Express.Multer.File | null;

  @IsOptional()
  @IsArray()
  @Type(() => StatelessCover)
  @ApiProperty({ type: [StatelessCover] })
  statelessCovers?: StatelessCover[];

  @IsOptional()
  @IsArray()
  @Type(() => StatefulCover)
  @ApiProperty({ type: [StatefulCover] })
  statefulCovers?: StatefulCover[];
}

export class CreateComicIssueSwaggerDto extends IntersectionType(
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
) {}
