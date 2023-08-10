import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { MailService } from '../mail/mail.service';
import { RequestUserData } from '../types/request-user-data';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
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

  async unsubscribe(email: string, verificationToken) {
    try {
      // TODO: verify token: sign email as jwt payload instead of hashing it as password?
      // ^^ https://wanago.io/2021/07/12/api-nestjs-confirming-email/
      // that way, verificationToken will have lifespan and won't leak any info on how we hash strings

      // TODO: EMAIL_CONFIRMATION_URL="https://dreader.app/verify-email" ...
      // TODO: .zip all updated .env files
      // TODO: have Athar check other TODOs
      // TODO: prettify email styles and text
      await this.prisma.newsletter.delete({ where: { email } });
    } catch {
      throw new BadRequestException('email not subscribed to newsletter');
    }

    this.mailService.unsubscribeFromNewsletter(email);
  }
}
