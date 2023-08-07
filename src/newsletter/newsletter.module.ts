import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { MailService } from '../mail/mail.service';

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService, MailService],
})
export class NewsletterModule {}
