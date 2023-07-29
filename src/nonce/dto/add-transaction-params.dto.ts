import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString } from 'class-validator';

export class AddTransactionParams {
  @IsString()
  queueName: string;

  @IsArray()
  @Type(() => String)
  @ApiProperty({ type: [String] })
  serializedTxs: string[];
}
