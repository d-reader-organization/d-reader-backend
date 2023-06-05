import {
  // IsAlphanumeric,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateWalletDto {
  @IsOptional()
  // @IsAlphanumeric()
  @MaxLength(40)
  name?: string;

  // @IsEnum(Role)
  // @IsOptional()
  // @ApiProperty({ enum: Role })
  // role?: Role;

  @IsString()
  @IsOptional()
  referrer?: string;
}
