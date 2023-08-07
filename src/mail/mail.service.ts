import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '@prisma/client';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async subscribedToNewsletter(recipient: string) {
    try {
      await this.mailerService.sendMail({
        to: recipient,
        // from: 'localhost@dReader.io',
        subject: 'Newsletter subscription',
        template: 'subscribedToNewsletter',
      });
    } catch (e) {
      console.log(`Error while sending subscription email to ${recipient}`, e);
    }
  }

  async userRegistered(user: User) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        // from: 'localhost@dReader.io',
        subject: 'dReader account created',
        template: 'userRegistered',
        context: {
          name: user.name,
          verificationToken: 'aaaaa',
        },
      });
    } catch (e) {
      console.error(e);
      console.log(
        `Failed to send 'registration successful' email to ${user.email}`,
      );
    }
  }
}
