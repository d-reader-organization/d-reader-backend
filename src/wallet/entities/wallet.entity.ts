import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class Wallet {
  @IsSolanaAddress()
  address: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(24)
  avatar: string | null;

  // TODO v1.1: We most likely don't want nonce in this class
  @IsUUID()
  @IsOptional()
  nonce: string;

  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role;
}
