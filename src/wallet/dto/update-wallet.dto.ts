import { IsOptional, MaxLength } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class UpdateWalletDto {
  @IsOptional()
  @MaxLength(24)
  name?: string;

  // @IsEnum(Role)
  // @IsOptional()
  // @ApiProperty({ enum: Role })
  // role?: Role;

  @IsSolanaAddress()
  @IsOptional()
  referrer?: string;
}
