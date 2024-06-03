import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  nameOrEmail: string;

  @IsString()
  password: string;
}
