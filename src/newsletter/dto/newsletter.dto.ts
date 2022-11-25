import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsEmail } from 'class-validator';
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
}

export async function toNewsletterDto(newsletter: Newsletter) {
  const plainNewsletter: NewsletterDto = {
    walletAddress: newsletter.walletAddress,
    email: newsletter.email,
    wantsDevelopmentProgressNews: newsletter.wantsDevelopmentProgressNews,
    wantsPlatformContentNews: newsletter.wantsPlatformContentNews,
    wantsFreeNFTs: newsletter.wantsFreeNFTs,
  };

  const newsletterDto = plainToInstance(NewsletterDto, plainNewsletter);
  return newsletterDto;
}

export const toNewsletterDtoArray = (newsletters: Newsletter[]) => {
  return Promise.all(newsletters.map(toNewsletterDto));
};
