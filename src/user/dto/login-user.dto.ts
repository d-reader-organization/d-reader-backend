import { IsString } from 'class-validator';

export class LoginUserDto {
  @IsString()
  nameOrEmail: string;

  @IsString()
  password: string;
}
