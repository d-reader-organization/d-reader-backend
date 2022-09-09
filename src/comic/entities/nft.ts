import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class NFT {
  @IsString()
  @IsNotEmpty()
  mint: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  uri: string;

  @IsUrl()
  image: string;

  @IsString()
  collectionName: string;
}
