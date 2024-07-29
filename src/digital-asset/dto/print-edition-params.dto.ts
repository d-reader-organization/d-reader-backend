import { IsBoolean, IsString } from 'class-validator';

export class PrintEditionParams {
  @IsString()
  masterEditionAddress: string;

  @IsString()
  buyer: string;
}
