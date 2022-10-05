import { Exclude, Expose } from 'class-transformer';
import { IsEnum, IsOptional, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class UpdateWalletDto {
  @Expose()
  @IsOptional()
  @MaxLength(24)
  label?: string;

  @Expose()
  @IsEnum(Role)
  @IsOptional()
  @ApiProperty({ enum: Role })
  role?: Role;
}
