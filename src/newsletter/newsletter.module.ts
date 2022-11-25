import { Module } from '@nestjs/common';
import { MailService } from 'src/mail/mail.service';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService, MailService],
})
export class NewsletterModule {}
