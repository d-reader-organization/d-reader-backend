import { IsString } from 'class-validator';
import { IsStrongPassword } from '../decorators/IsStrongPassword';

export class UpdatePasswordDto {
  @IsString()
  oldPassword: string;

  @IsStrongPassword()
  newPassword: string;
}

export class ResetPasswordDto {
  @IsString()
  verificationToken: string;

  @IsStrongPassword()
  newPassword: string;
}

export class RequestPasswordResetDto {
  @IsString()
  nameOrEmail: string;
}
