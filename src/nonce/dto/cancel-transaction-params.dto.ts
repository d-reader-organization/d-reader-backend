import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional } from 'class-validator';

export class NonceTransactionParams {
  @IsArray()
  @Type(() => String)
  @ApiProperty({ type: [String] })
  serializedTx: string[];

  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;
}
