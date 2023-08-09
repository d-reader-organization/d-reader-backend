import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsValidUsername } from '../decorators/IsValidUsername';
import { USERNAME_MAX_SIZE, USERNAME_MIN_SIZE } from '../constants';

export class UpdateUserDto {
  @IsValidUsername()
  @MinLength(USERNAME_MIN_SIZE)
  @MaxLength(USERNAME_MAX_SIZE)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  referrer?: string;
}
