import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserPrivacyConsent, ConsentType } from '@prisma/client';
import { TransformDateStringToDate } from 'src/utils/transform';

export class UserPrivacyConsentDto {
  @IsPositive()
  id: number;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  createdAt: Date;

  @IsEnum(ConsentType)
  @ApiProperty({ enum: ConsentType })
  consentType: ConsentType;

  @IsBoolean()
  isConsentGiven: boolean;
}

export function toUserPrivacyConsentDto(consent: UserPrivacyConsent) {
  const plainUserConsent: UserPrivacyConsentDto = {
    id: consent.id,
    consentType: consent.consentType,
    createdAt: consent.createdAt,
    isConsentGiven: consent.isConsentGiven,
  };

  const consentDto = plainToInstance(UserPrivacyConsentDto, plainUserConsent);
  return consentDto;
}

export const toUserPrivacyConsentDtoArray = (
  userConsents: UserPrivacyConsent[],
) => {
  return userConsents.map(toUserPrivacyConsentDto);
};
