import { IsString, IsStrongPassword } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  oldPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
