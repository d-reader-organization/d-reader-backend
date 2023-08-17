import { IsOptional, IsString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class MintOneParams {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  minterAddress: string;

  @IsOptional()
  @IsString()
  label?: string;
}
