import { MaxLength, MinLength } from 'class-validator';

export class UpdateWalletDto {
  @MinLength(0)
  @MaxLength(20)
  label: string;
}
