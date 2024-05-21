import { IsOptional, IsString } from 'class-validator';

export class IntentComicMintedParams {
  @IsString()
  comicAddress: string;

  @IsOptional()
  @IsString()
  utmSource?: string;
}
