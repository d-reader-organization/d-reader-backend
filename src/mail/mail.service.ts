import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

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
