import { IsOptional, IsString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class MintParams {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  minterAddress: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  mintCount?: string;
}
