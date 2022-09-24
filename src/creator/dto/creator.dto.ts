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
import { getReadUrl } from 'src/aws/s3client';

@Exclude()
export class CreatorDto {
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
  @Type(() => ComicDto)
  comics: ComicDto[];

  // @Expose()
  // @Type(() => WalletDto)
  // wallet: WalletDto[];

  // presignUrls = async () => {
  //   // Serial
  //   // this.thumbnail = await getReadUrl(this.thumbnail);
  //   // this.avatar = await getReadUrl(this.avatar);
  //   // this.banner = await getReadUrl(this.banner);
  //   // this.logo = await getReadUrl(this.logo);

  //   // Parallel
  //   await Promise.all([
  //     async () => (this.thumbnail = await getReadUrl(this.thumbnail)),
  //     async () => (this.avatar = await getReadUrl(this.avatar)),
  //     async () => (this.banner = await getReadUrl(this.banner)),
  //     async () => (this.logo = await getReadUrl(this.logo)),
  //   ]);

  //   return this;
  // };

  static async presignUrls(input: CreatorDto): Promise<CreatorDto>;
  static async presignUrls(input: CreatorDto[]): Promise<CreatorDto[]>;
  static async presignUrls(
    input: CreatorDto | CreatorDto[],
  ): Promise<CreatorDto | CreatorDto[]> {
    if (Array.isArray(input)) {
      input = await Promise.all(
        input.map(async (obj) => {
          await Promise.all([
            async () => (obj.thumbnail = await getReadUrl(obj.thumbnail)),
            async () => (obj.avatar = await getReadUrl(obj.avatar)),
            async () => (obj.banner = await getReadUrl(obj.banner)),
            async () => (obj.logo = await getReadUrl(obj.logo)),
          ]);
          return obj;
        }),
      );
      return input;
    } else {
      input.thumbnail = await getReadUrl(input.thumbnail);
      input.avatar = await getReadUrl(input.avatar);
      input.banner = await getReadUrl(input.banner);
      input.logo = await getReadUrl(input.logo);
      return input;
    }
  }
}
