import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { ConsentType } from '@prisma/client';

export class CreateUserConsentDto {
  @IsEnum(ConsentType)
  @ApiProperty({ required: true })
  consentType: ConsentType;

  @IsBoolean()
  @ApiProperty({ required: true })
  isConsentGiven: boolean;
}
