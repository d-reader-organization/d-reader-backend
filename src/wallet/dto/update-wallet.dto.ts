import { IsEnum, IsOptional, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWalletDto {
  @IsOptional()
  @MaxLength(24)
  label?: string;

  @IsEnum(Role)
  @IsOptional()
  @ApiProperty({ enum: Role })
  role?: Role;
}
