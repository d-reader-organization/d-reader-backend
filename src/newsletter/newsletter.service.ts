import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { MailService } from 'src/mail/mail.service';
import { RequestUserData } from 'src/types/request-user-data';
import { UpsertNewsletterDto } from './dto/upsert-newsletter.dto';

@Injectable()
export class NewsletterService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async subscribe(
    walletAddress: string,
    upsertNewsletterDto: UpsertNewsletterDto,
    requestUserData: RequestUserData,
  ) {
    try {
      const data = { ...upsertNewsletterDto, ...requestUserData };

      const newsletter = await this.prisma.newsletter.upsert({
        where: { walletAddress },
        update: data,
        create: { walletAddress, ...data },
      });

      this.mailService.subscribedSuccessfully(upsertNewsletterDto.email);
      return newsletter;
    } catch {
      throw new NotFoundException(
        `Wallet ${walletAddress} is not subscribed to newsletter`,
      );
    }
  }

  async findAll() {
    const newsletters = await this.prisma.newsletter.findMany();
    return newsletters;
  }

  async findOne(walletAddress: string) {
    const newsletter = await this.prisma.newsletter.findUnique({
      where: { walletAddress },
    });

    if (!newsletter) {
      throw new NotFoundException(
        `Wallet ${walletAddress} is not subscribed to newsletter`,
      );
    }

    return newsletter;
  }

  async unsubscribe(walletAddress: string) {
    try {
      const newsletter = await this.prisma.newsletter.delete({
        where: { walletAddress },
      });

      return newsletter;
    } catch {
      throw new NotFoundException(
        `Wallet ${walletAddress} is not subscribed to newsletter`,
      );
    }
  }
}
