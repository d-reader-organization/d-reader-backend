import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class Wallet {
  @IsSolanaAddress()
  address: string;

  @IsUUID()
  @IsOptional()
  nonce: string | null;

  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role;
}
