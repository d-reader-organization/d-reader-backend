import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWalletDto {
  @IsOptional()
  @MaxLength(24)
  name?: string;

  // @IsEnum(Role)
  // @IsOptional()
  // @ApiProperty({ enum: Role })
  // role?: Role;

  @IsString()
  @IsOptional()
  referrer?: string;
}
