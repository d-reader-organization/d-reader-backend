import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class RequestPasswordDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  name?: string;

  @IsSolanaAddress()
  @IsOptional()
  referrer?: string;
}
