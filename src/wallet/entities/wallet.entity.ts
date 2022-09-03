import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class Wallet {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  nonce: string | null;

  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role;
}
