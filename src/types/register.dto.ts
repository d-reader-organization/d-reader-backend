import { IsEmail, IsStrongPassword } from 'class-validator';
import { IsValidUsername } from '../decorators/IsValidUsername';
import { OmitType } from '@nestjs/swagger';
import { PASSWORD_OPTIONS, PASSWORD_REQUIREMENTS_MESSAGE } from '../constants';

export class RegisterDto {
  @IsValidUsername()
  name: string;

  @IsEmail()
  email: string;

  @IsStrongPassword(PASSWORD_OPTIONS, {
    message: PASSWORD_REQUIREMENTS_MESSAGE,
  })
  password: string;
}

export class GoogleRegisterDto extends OmitType(RegisterDto, [
  'email',
  'password',
] as const) {}
