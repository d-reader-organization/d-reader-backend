import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { USERNAME_MIN_SIZE, USERNAME_MAX_SIZE } from '../constants';
import { IsValidUsername } from '../decorators/IsValidUsername';

export class UpdateUserDto {
  @IsValidUsername()
  @IsOptional()
  username?: string;

  @MinLength(USERNAME_MIN_SIZE)
  @MaxLength(USERNAME_MAX_SIZE)
  @IsOptional()
  displayName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  referrer?: string;
}
