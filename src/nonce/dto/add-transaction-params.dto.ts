import { IsString } from 'class-validator';

export class AddTransactionParams {
  @IsString()
  queueName: string;

  @IsString()
  serializedTx: string;
}
