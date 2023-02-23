import { IsString, IsNumberString } from 'class-validator';

export class ListParams {
  @IsString()
  mintAccount: string;
  @IsNumberString()
  price: number;
}
