import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '@prisma/client';

const logError = (template: string, recipient: string, e: any) => {
  console.error(`Failed to send ${template} email to ${recipient}: ${e}`);
};

const SUBSCRIBE_TO_NEWSLETTER = 'subscribedToNewsletter';
const USER_REGISTERED = 'userRegistered';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async subscribedToNewsletter(recipient: string) {
    try {
      await this.mailerService.sendMail({
        to: recipient,
        subject: 'Newsletter subscription',
        template: SUBSCRIBE_TO_NEWSLETTER,
      });
    } catch (e) {
      logError(SUBSCRIBE_TO_NEWSLETTER, recipient, e);
    }
  }

  async userRegistered(user: User, verificationToken: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'dReader account created',
        template: USER_REGISTERED,
        context: {
          name: user.name,
          verificationToken,
        },
      });
    } catch (e) {
      logError(USER_REGISTERED, user.email, e);
    }
  }
}
