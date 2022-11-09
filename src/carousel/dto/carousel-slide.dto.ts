import { Exclude, Expose, Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Presignable } from 'src/types/presignable';
import { CarouselLocation } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class CarouselSlideDto extends Presignable<CarouselSlideDto> {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsString()
  image: string;

  @Expose()
  @IsNumber()
  priority: number;

  @Expose()
  @IsString()
  link: string;

  @Expose()
  @IsString()
  @IsOptional()
  title?: string;

  @Expose()
  @IsString()
  @IsOptional()
  subtitle?: string;

  @Expose()
  @Transform(({ obj }) => !!obj.publishedAt)
  isPublished: boolean;

  @Expose()
  @Transform(({ obj }) => !!obj.expiredAt)
  isExpired: boolean;

  @Expose()
  @IsEnum(CarouselLocation)
  @ApiProperty({ enum: CarouselLocation })
  location: CarouselLocation;

  protected async presign(): Promise<CarouselSlideDto> {
    return await super.presign(this, ['image']);
  }

  static async presignUrls(input: CarouselSlideDto): Promise<CarouselSlideDto>;
  static async presignUrls(
    input: CarouselSlideDto[],
  ): Promise<CarouselSlideDto[]>;
  static async presignUrls(
    input: CarouselSlideDto | CarouselSlideDto[],
  ): Promise<CarouselSlideDto | CarouselSlideDto[]> {
    if (Array.isArray(input)) {
      return await Promise.all(input.map((obj) => obj.presign()));
    } else return await input.presign();
  }
}
