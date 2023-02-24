import { IsString, IsNumberString } from 'class-validator';
import { IsOptionalString } from 'src/decorators/IsOptionalString';

export class PrivateBidParams {
  @IsString()
  mintAccount: string;
  @IsNumberString()
  price: number;
  @IsOptionalString()
  seller: string;
  @IsOptionalString()
  tokenAccount: string;
}
