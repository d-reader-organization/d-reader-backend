import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsEmail, IsString } from 'class-validator';
import { Newsletter } from '@prisma/client';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class NewsletterDto {
  @IsSolanaAddress()
  walletAddress: string;

  @IsEmail()
  email: string;

  @IsBoolean()
  wantsDevelopmentProgressNews: boolean;

  @IsBoolean()
  wantsPlatformContentNews: boolean;

  @IsBoolean()
  wantsFreeNFTs: boolean;

  @IsString()
  ip: string;

  @IsString()
  country: string;

  @IsString()
  city: string;

  @IsString()
  browser: string;

  @IsString()
  device: string;

  @IsString()
  os: string;
}

export async function toNewsletterDto(newsletter: Newsletter) {
  const plainNewsletter: NewsletterDto = {
    walletAddress: newsletter.walletAddress,
    email: newsletter.email,
    wantsDevelopmentProgressNews: newsletter.wantsDevelopmentProgressNews,
    wantsPlatformContentNews: newsletter.wantsPlatformContentNews,
    wantsFreeNFTs: newsletter.wantsFreeNFTs,
    ip: newsletter.ip,
    country: newsletter.country,
    city: newsletter.city,
    browser: newsletter.browser,
    device: newsletter.device,
    os: newsletter.os,
  };

  const newsletterDto = plainToInstance(NewsletterDto, plainNewsletter);
  return newsletterDto;
}

export const toNewsletterDtoArray = (newsletters: Newsletter[]) => {
  return Promise.all(newsletters.map(toNewsletterDto));
};
