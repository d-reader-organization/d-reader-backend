import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ApiProperty } from '@nestjs/swagger';
import { ComicDto } from 'src/comic/dto/comic.dto';
import { Presignable } from 'src/types/presignable';

@Exclude()
export class CreatorDto extends Presignable<CreatorDto> {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsNotEmpty()
  @MaxLength(54)
  name: string;

  @Expose()
  @IsNotEmpty()
  @IsKebabCase()
  slug: string;

  @Expose()
  @Transform(({ obj }) => !!obj.deletedAt)
  isDeleted: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.verifiedAt)
  isVerified: boolean;

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
  @MaxLength(256)
  @IsOptional()
  @ValidateIf((p) => p.description !== '')
  @ApiProperty({ required: false })
  description: string;

  @Expose()
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
  @IsArray()
  @IsOptional()
  @Type(() => ComicDto)
  comics?: ComicDto[];

  protected async presign(): Promise<CreatorDto> {
    return await super.presign(this, ['thumbnail', 'avatar', 'banner', 'logo']);
  }

  static async presignUrls(input: CreatorDto): Promise<CreatorDto>;
  static async presignUrls(input: CreatorDto[]): Promise<CreatorDto[]>;
  static async presignUrls(
    input: CreatorDto | CreatorDto[],
  ): Promise<CreatorDto | CreatorDto[]> {
    if (Array.isArray(input)) {
      return await Promise.all(
        input.map((obj) => {
          if (obj.comics) ComicDto.presignUrls(obj.comics);
          return obj.presign();
        }),
      );
    } else {
      if (input.comics) ComicDto.presignUrls(input.comics);
      return await input.presign();
    }
  }
}
