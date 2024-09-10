import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber } from 'class-validator';

export class AddWalletWhiteListDto {
  @IsNumber()
  couponId: number;

  @IsArray()
  @ApiProperty({ type: [String] })
  @Type(() => String)
  walletWhiteList: string[];
}
