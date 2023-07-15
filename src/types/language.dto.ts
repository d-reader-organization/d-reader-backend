import { ApiProperty } from '@nestjs/swagger';
import { Language } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class LanguageDto {
  @ApiProperty({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  lang?: Language;
}
