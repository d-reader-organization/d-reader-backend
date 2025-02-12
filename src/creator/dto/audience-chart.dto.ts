import { CreatorSnapshot } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsArray, IsNumber } from 'class-validator';
import {
  CreatorSnapshotDto,
  toCreatorSnapshotDtoArray,
} from './creator-snapshot.dto';

export class AudienceChartDto {
  @IsNumber()
  totalLikes: number;

  @IsNumber()
  totalViews: number;

  @IsNumber()
  totalReaders: number;

  @IsNumber()
  totalBookmarks: number;

  @IsNumber()
  totalFollowers: number;

  @IsArray()
  @Type(() => CreatorSnapshotDto)
  snapshots: CreatorSnapshotDto[];
}

export type AudienceChartInput = {
  totalLikes: number;
  totalViews: number;
  totalReaders: number;
  totalBookmarks: number;
  totalFollowers: number;
  snapshots: CreatorSnapshot[];
};

export function toAudienceChartDto(input: AudienceChartInput) {
  const plainAudienceChartDto: AudienceChartDto = {
    totalLikes: input.totalLikes,
    totalReaders: input.totalReaders,
    totalViews: input.totalViews,
    totalBookmarks: input.totalBookmarks,
    totalFollowers: input.totalFollowers,
    snapshots: toCreatorSnapshotDtoArray(input.snapshots),
  };

  const audienceChartDto = plainToInstance(
    AudienceChartDto,
    plainAudienceChartDto,
  );
  return audienceChartDto;
}
