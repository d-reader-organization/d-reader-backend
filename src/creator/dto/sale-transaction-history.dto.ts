import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BasicUserDto, toBasicUserDto } from '../../user/dto/basic-user-dto';
import { ifDefined } from '../../utils/lodash';

export enum SaleSource {
  Sale = 'Sale',
  Royalty = 'Royalty',
}

export enum SaleProductType {
  Comic = 'Comic',
  DigitalArt = 'DigitalArt',
}

export class SaleTransactionDto {
  @IsString()
  transaction: string;

  @IsDate()
  date: Date;

  @IsString()
  buyerAddress: string;

  @IsOptional()
  @Type(() => BasicUserDto)
  buyer?: BasicUserDto;

  @IsEnum(SaleSource)
  @ApiProperty({ enum: SaleSource })
  source: SaleSource;

  @IsEnum(SaleProductType)
  @ApiProperty({ enum: SaleProductType })
  productType: SaleProductType;

  @IsNumber()
  amount: number;

  @IsNumber()
  quantity: number;

  @IsString()
  splTokenAddress: string;
}

type WithUser = { user?: User };

export type SaleTransactionInput = {
  transaction: string;
  date: Date;
  buyerAddress: string;
  quantity: number;
  amount: number;
  splTokenAddress: string;
  source: SaleSource;
  productType: SaleProductType;
} & WithUser;

export function toSaleTransactionDto(input: SaleTransactionInput) {
  const plainSaleTransactionDto: SaleTransactionDto = {
    transaction: input.transaction,
    date: input.date,
    buyerAddress: input.buyerAddress,
    source: input.source,
    productType: input.productType,
    amount: input.amount,
    quantity: input.quantity,
    splTokenAddress: input.splTokenAddress,
    buyer: ifDefined(input.user, toBasicUserDto),
  };

  const saleTransactionDto = plainToInstance(
    SaleTransactionDto,
    plainSaleTransactionDto,
  );
  return saleTransactionDto;
}

export function toSaleTransactionDtoArray(inputs: SaleTransactionInput[]) {
  return inputs.map(toSaleTransactionDto);
}
