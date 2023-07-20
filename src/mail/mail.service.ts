import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async subscribedSuccessfully(recipient: string) {
    try {
      await this.mailerService.sendMail({
        to: recipient,
        // from: 'localhost@dReader.io',
        subject: 'Newsletter subscription',
        template: 'subscribedSuccessfully',
      });
    } catch (e) {
      console.log(`Error while sending subscription email to ${recipient}`, e);
    }
  }
}
