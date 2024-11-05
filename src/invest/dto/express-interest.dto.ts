import { IsString } from 'class-validator';

export class ExpressInterestDto {
  @IsString()
  transaction: string;
}
