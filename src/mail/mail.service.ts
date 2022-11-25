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
        subject: 'Newsletter - dReader',
        template: 'subscribedSuccessfully',
      });
    } catch (e) {
      console.log(`Error while sending subscription email to ${recipient}`, e);
    }
  }

  async sendEmailExample() {
    try {
      await this.mailerService.sendMail({
        to: 'recipient@gmail.com',
        // from: 'localhost@dReader.io',
        subject: 'Test Email',
        template: 'test',
        context: {
          name: 'John Doe',
          currentDate: new Date().toLocaleDateString(),
        },
      });
    } catch (e) {
      console.log('Error while sending emails: ', e);
    }
  }
}
