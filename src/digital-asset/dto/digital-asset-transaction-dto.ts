import { IsString } from 'class-validator';

export class DigitalAssetCreateTransactionDto {
  @IsString()
  transaction: string;

  @IsString()
  digitalAssetAddress: string;
}
