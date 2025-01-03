import {
    IsEnum,
    IsInt,
    IsUrl,
  } from 'class-validator';
  import { plainToInstance } from 'class-transformer';
  import { ApiProperty } from '@nestjs/swagger';
  import { ComicRarity } from '@prisma/client';
  import { getPublicUrl } from '../../aws/s3client';
  
  export class CollectibleComicRarityStatsDto {
    @IsUrl()
    image: string;

    @IsInt()
    used: number;
  
    @IsInt()
    signed: number;
  
    @IsEnum(ComicRarity)
    @ApiProperty({ enum: ComicRarity })
    rarity: ComicRarity;
  }
  
  export type CollectibleComicRarityStatsInput = {
    image: string;
    used: number;
    signed: number;
    rarity: ComicRarity;
  }
  
  export async function toCollectibleComicRarityStatsDto(input: CollectibleComicRarityStatsInput) {
  
    const plainCollectibleComicRarityStatsDtoDto: CollectibleComicRarityStatsDto = {
      image: getPublicUrl(input.image),
      used: input.used,
      signed: input.signed,
      rarity: input.rarity
    };
  
    const collectibleComicRarityStatsDto = plainToInstance(CollectibleComicRarityStatsDto, plainCollectibleComicRarityStatsDtoDto);
    return collectibleComicRarityStatsDto;
  }
  
  export const toCollectibleComicRarityStatsDtoArray = (inputs: CollectibleComicRarityStatsInput[]) => {
    return Promise.all(inputs.map(toCollectibleComicRarityStatsDto));
  };
  