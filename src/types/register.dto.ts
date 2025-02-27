import { IsEmail, IsOptional, IsString } from 'class-validator';
import { OmitType } from '@nestjs/swagger';
import { IsValidUsername } from '../decorators/IsValidUsername';
import { IsStrongPassword } from '../decorators/IsStrongPassword';

export class RegisterDto {
  @IsOptional()
  @IsValidUsername()
  name?: string;

  @IsOptional()
  @IsValidUsername()
  username?: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  ref?: string;
}

export class GoogleRegisterDto extends OmitType(RegisterDto, [
  'email',
  'password',
] as const) {}
