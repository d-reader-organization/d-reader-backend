import { IsString, IsStrongPassword } from 'class-validator';
import { PASSWORD_OPTIONS, PASSWORD_REQUIREMENTS_MESSAGE } from '../constants';

export class UpdatePasswordDto {
  @IsString()
  oldPassword: string;

  @IsStrongPassword(PASSWORD_OPTIONS, {
    message: PASSWORD_REQUIREMENTS_MESSAGE,
  })
  newPassword: string;
}

export class ResetPasswordDto {
  @IsString()
  verificationToken: string;

  @IsStrongPassword(PASSWORD_OPTIONS)
  newPassword: string;
}

export class RequestPasswordResetDto {
  @IsString()
  nameOrEmail: string;
}
