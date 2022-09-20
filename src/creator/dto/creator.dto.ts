import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsSnakeCase } from 'src/decorators/IsSnakeCase';
import { ApiProperty } from '@nestjs/swagger';
import { ComicDto } from 'src/comic/dto/comic.dto';

@Exclude()
export class CreatorDto {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(54)
  name: string;

  @Expose()
  @IsNotEmpty()
  @IsSnakeCase()
  slug: string;

  // @Expose()
  // @IsOptional()
  // @Type(() => Date)
  // deletedAt: Date | null;

  @Expose()
  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;

  // @Expose()
  // @IsOptional()
  // @Type(() => Date)
  // verifiedAt: Date | null;

  @Expose()
  @Transform(({ obj }) => !!obj.verifiedAt)
  isVerified: boolean;

  // TODO v1.1: isFeatured, isPopular

  @Expose()
  @IsString()
  thumbnail: string;

  @Expose()
  @IsString()
  avatar: string;

  @Expose()
  @IsString()
  banner: string;

  @Expose()
  @IsString()
  logo: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  @IsOptional()
  @ValidateIf((p) => p.description !== '')
  @ApiProperty({ required: false })
  description: string;

  @Expose()
  @IsString()
  @MaxLength(128)
  @IsOptional()
  @ValidateIf((p) => p.flavorText !== '')
  @ApiProperty({ required: false })
  flavorText: string;

  @Expose()
  @IsUrl()
  @IsOptional()
  @ValidateIf((p) => p.website !== '')
  @ApiProperty({ required: false })
  website: string;

  // @Expose()
  // @IsUrl()
  // @IsOptional()
  // @ValidateIf((p) => p.twitter !== '')
  // @ApiProperty({ required: false })
  // twitter: string;

  // @Expose()
  // @IsUrl()
  // @IsOptional()
  // @ValidateIf((p) => p.instagram !== '')
  // @ApiProperty({ required: false })
  // instagram: string;

  @Expose()
  @Type(() => ComicDto)
  comics: ComicDto[];

  // @Expose()
  // @Type(() => WalletDto)
  // wallet: WalletDto[];
}
