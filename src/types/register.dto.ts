import { IsEmail, IsOptional } from 'class-validator';
import { OmitType } from '@nestjs/swagger';
import { IsValidUsername } from '../decorators/IsValidUsername';
import { IsStrongPassword } from '../decorators/IsStrongPassword';

export class RegisterDto {
  @IsValidUsername()
  name?: string;

  @IsValidUsername()
  @IsOptional()
  username?: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;
}

export class GoogleRegisterDto extends OmitType(RegisterDto, [
  'email',
  'password',
] as const) {}
