import { IsNotEmpty, IsString } from 'class-validator';

export class Collection {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;
}
