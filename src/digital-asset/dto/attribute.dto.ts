import { IsString } from 'class-validator';

export class AttributeDto {
  @IsString()
  trait: string;

  @IsString()
  value: string;
}
