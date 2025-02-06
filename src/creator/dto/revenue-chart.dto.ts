import { plainToInstance, Type } from 'class-transformer';
import { IsArray, IsDate, IsNumber } from 'class-validator';
import { RevenueSnapshot } from './types';

export class RevenueSnapshotDto {
  @IsDate()
  date: Date;

  @IsNumber()
  sales: number;

  @IsNumber()
  royalties: number;

  @IsNumber()
  others: number;
}

export class RevenueChartDto {
  @IsNumber()
  totalSales: number;

  @IsNumber()
  totalRoyalties: number;

  @IsNumber()
  others: number;

  @IsArray()
  @Type(() => RevenueSnapshotDto)
  snapshots: RevenueSnapshotDto[];
}

export type RevenueChartInput = {
  totalSales: number;
  totalRoyalties: number;
  others: number;
  snapshots: RevenueSnapshot[];
};

export function toRevenueChartDto(input: RevenueChartInput) {
  const plainRevenueChartDto: RevenueChartDto = {
    totalSales: input.totalSales,
    totalRoyalties: input.totalRoyalties,
    others: input.others,
    snapshots: toRevenueSnapshotDtoArray(input.snapshots),
  };

  const revenueChartDto = plainToInstance(
    RevenueChartDto,
    plainRevenueChartDto,
  );
  return revenueChartDto;
}

export function toRevenueSnapshotDto(input: RevenueSnapshot) {
  const plainRevenueSnapshotDto: RevenueSnapshotDto = {
    date: input.date,
    sales: input.sales,
    royalties: input.royalties,
    others: input.others,
  };

  const revenueSnapshotDto: RevenueSnapshotDto = plainToInstance(
    RevenueSnapshotDto,
    plainRevenueSnapshotDto,
  );
  return revenueSnapshotDto;
}

export function toRevenueSnapshotDtoArray(inputs: RevenueSnapshot[]) {
  return inputs.map(toRevenueSnapshotDto);
}
