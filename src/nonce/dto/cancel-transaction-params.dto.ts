import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class NonceTransactionParams {
  @IsString()
  serializedTx: string;

  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;
}
