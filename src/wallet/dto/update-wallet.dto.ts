import { Exclude, Expose } from 'class-transformer';
import { IsEnum, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';

@Exclude()
export class UpdateWalletDto {
  @Expose()
  @MaxLength(24)
  label?: string;

  @Expose()
  @IsEnum(Role)
  role?: Role;
}
