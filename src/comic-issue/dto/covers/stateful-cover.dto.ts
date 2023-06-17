import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComicRarity, StatefulCover } from '@prisma/client';
import { Transform, plainToInstance } from 'class-transformer';
import { transformToUrl } from 'src/aws/s3client';

export class StatefulCoverDto {
  @IsString()
  artist: string;

  @IsBoolean()
  isSigned: boolean;

  @IsBoolean()
  isUsed: boolean;

  @IsOptional()
  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity?: ComicRarity;

  @IsString()
  @Transform(transformToUrl, { toClassOnly: true })
  image: string;
}

export function toStatefulCoverDto(cover: StatefulCover) {
  return plainToInstance(StatefulCoverDto, cover);
}

export const toStatefulCoverDtoArray = (covers: StatefulCover[]) => {
  return covers.map(toStatefulCoverDto);
};
