import { IsString, IsStrongPassword } from 'class-validator';
import { PASSWORD_OPTIONS } from '../constants';

export class UpdatePasswordDto {
  @IsString()
  oldPassword: string;

  @IsStrongPassword(PASSWORD_OPTIONS)
  newPassword: string;
}
