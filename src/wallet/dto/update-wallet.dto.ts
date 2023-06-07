import { IsOptional, IsString } from 'class-validator';
import { IsValidUsername } from '../../decorators/IsValidUsername';

export class UpdateWalletDto {
  @IsOptional()
  @IsValidUsername()
  name?: string;

  // @IsEnum(Role)
  // @IsOptional()
  // @ApiProperty({ enum: Role })
  // role?: Role;

  @IsString()
  @IsOptional()
  referrer?: string;
}
