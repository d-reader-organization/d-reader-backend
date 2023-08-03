import { plainToInstance } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { Newsletter } from '@prisma/client';

export class NewsletterDto {
  @IsEmail()
  email: string;
}

export async function toNewsletterDto(newsletter: Newsletter) {
  const plainNewsletter: NewsletterDto = {
    email: newsletter.email,
  };

  const newsletterDto = plainToInstance(NewsletterDto, plainNewsletter);
  return newsletterDto;
}

export const toNewsletterDtoArray = (newsletters: Newsletter[]) => {
  return Promise.all(newsletters.map(toNewsletterDto));
};
