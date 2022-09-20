import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class WalletDto {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsSolanaAddress()
  address: string;

  @Expose()
  @IsString()
  @MaxLength(24)
  @IsOptional()
  @ApiProperty({ required: false })
  label: string;

  @Expose()
  @IsString()
  avatar: string;

  @Expose()
  @IsEnum(Role)
  @ApiProperty({ enum: Role, required: false })
  role: Role;
}
