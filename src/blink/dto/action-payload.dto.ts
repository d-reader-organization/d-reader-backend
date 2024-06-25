import { IsString } from 'class-validator';

export class ActionPayloadDto {
  @IsString()
  account: string;
}
