import { Language } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class LanguageDto {
  @IsOptional()
  @IsEnum(Language)
  lang?: Language;
}
