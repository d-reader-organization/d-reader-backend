import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { TransformStringToNumber } from '../../utils/transform';

export class MintParams {
  @TransformStringToNumber()
  @IsNumber()
  couponId: number;

  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  minterAddress: string;

  @IsOptional()
  @IsString()
  label: string;

  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  @Min(1)
  @Max(5)
  numberOfItems?: string;
}
