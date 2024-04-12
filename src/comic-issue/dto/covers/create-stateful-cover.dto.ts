import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { ComicRarity } from '@prisma/client';
import { Transform } from 'class-transformer';
import { TransformStringToBoolean } from '../../../utils/transform';

export class CreateStatefulCoverBodyDto {
  @IsString()
  artist: string;

  @IsBoolean()
  @TransformStringToBoolean()
  isSigned: boolean;

  @IsBoolean()
  @TransformStringToBoolean()
  isUsed: boolean;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity: ComicRarity;
}

export class CreateStatefulCoverFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;
}

export class CreateStatefulCoverDto extends IntersectionType(
  CreateStatefulCoverBodyDto,
  CreateStatefulCoverFilesDto,
) {}
