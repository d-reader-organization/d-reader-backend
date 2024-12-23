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
  //TODO: for backward compatibility, remove this later
  @IsValidUsername()
  @MinLength(USERNAME_MIN_SIZE)
  @MaxLength(USERNAME_MAX_SIZE)
  @IsOptional()
  name?: string;

  @IsValidUsername()
  @MinLength(USERNAME_MIN_SIZE)
  @MaxLength(USERNAME_MAX_SIZE)
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
