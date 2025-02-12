import { CreatorSnapshot } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsArray, IsNumber } from 'class-validator';
import {
  CreatorSnapshotDto,
  toCreatorSnapshotDtoArray,
} from './creator-snapshot.dto';

export class RevenueChartDto {
  @IsNumber()
  totalSales: number;

  @IsNumber()
  totalRoyalties: number;

  @IsNumber()
  others: number;

  @IsArray()
  @Type(() => CreatorSnapshotDto)
  snapshots: CreatorSnapshotDto[];
}

export type RevenueChartInput = {
  totalSales: number;
  totalRoyalties: number;
  others: number;
  snapshots: CreatorSnapshot[];
};

export function toRevenueChartDto(input: RevenueChartInput) {
  const plainRevenueChartDto: RevenueChartDto = {
    totalSales: input.totalSales,
    totalRoyalties: input.totalRoyalties,
    others: input.others,
    snapshots: toCreatorSnapshotDtoArray(input.snapshots),
  };

  const revenueChartDto = plainToInstance(
    RevenueChartDto,
    plainRevenueChartDto,
  );
  return revenueChartDto;
}
