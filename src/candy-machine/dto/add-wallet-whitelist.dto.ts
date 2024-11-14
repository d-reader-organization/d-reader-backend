import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddWalletWhiteListDto {
  @IsNumber()
  couponId: number;

  @IsOptional()
  @IsString()
  collectionAddress?: string;

  @IsArray()
  @ApiProperty({ type: [String] })
  @Type(() => String)
  walletWhiteList: string[];
}
