import { IsString } from 'class-validator';

export class MintOneParams {
  @IsString()
  candyMachineAddress: string;
}
