import { Injectable, NotFoundException } from '@nestjs/common';
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

  async unsubscribe(email: string) {
    try {
      const newsletter = this.prisma.newsletter.delete({
        where: { email },
      });
      // TODO v1: this.mailService.unsubscribedToNewsletter(email);
      return newsletter;
    } catch {
      throw new NotFoundException('Already unsubscribed');
    }
  }
}
