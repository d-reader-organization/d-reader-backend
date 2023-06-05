import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsValidUsername } from '../../decorators/IsValidUsername';

export class UpdateWalletDto {
  @IsOptional()
  @IsValidUsername()
  @MaxLength(32)
  name?: string;

  // @IsEnum(Role)
  // @IsOptional()
  // @ApiProperty({ enum: Role })
  // role?: Role;

  @IsString()
  @IsOptional()
  referrer?: string;
}
