import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { RequestUserData } from '../types/request-user-data';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  async subscribe(email: string, requestUserData: RequestUserData) {
    const data = { email, ...requestUserData };

    const newsletter = await this.prisma.newsletter.create({ data });
    this.mailService.subscribedToNewsletter(email);

    return newsletter;
  }

  async findAll() {
    return this.prisma.newsletter.findMany();
  }

  async unsubscribe(verificationToken: string) {
    // we don't need to check if the verification token is expired or not
    // when unsubscribing from newsletter
    const email = this.authService.decodeEmail(verificationToken);

    try {
      await this.prisma.newsletter.delete({ where: { email } });
    } catch {
      throw new BadRequestException('email not subscribed to newsletter');
    }

    this.mailService.unsubscribedFromNewsletter(email);
  }
}
