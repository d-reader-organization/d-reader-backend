import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum SignedDataType {
  Message = 'Message',
  Transaction = 'Transaction',
}

export class ConnectWalletDto {
  @IsString()
  address: string;

  @IsString()
  encoding: string;

  @IsEnum(SignedDataType)
  @ApiProperty({ enum: SignedDataType })
  signedDataType: SignedDataType;
}
