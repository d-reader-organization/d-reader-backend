import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum UtmSource {
  Web = 'web',
  Mobile = 'mobile',
}

export class IntentComicMintedParams {
  @IsString()
  comicAddress: string;

  @IsOptional()
  @IsEnum(UtmSource)
  utmSource?: UtmSource;
}
