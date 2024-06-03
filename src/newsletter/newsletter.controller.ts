import {
  Controller,
  Post,
  UseGuards,
  Delete,
  Req,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { Request } from 'src/types/request';
import { UAParser } from 'ua-parser-js';
import { RequestUserData } from '../types/request-user-data';
import { RealIP } from 'nestjs-real-ip';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const geoip = require('geoip-lite');

@UseGuards(ThrottlerGuard)
@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  // This route should have a captcha on frontend
  /* Subscribe to newsletter */
  @Throttle(2, 60)
  @Post('subscribe/:email')
  async subscribe(
    @Param('email') email: string,
    @Req() request: Request,
    @RealIP() ip = '',
  ) {
    const geo = geoip.lookup(ip);
    const parser = new UAParser(request.headers['user-agent']);

    const requestUser: RequestUserData = {
      ip,
      country: geo?.country,
      city: geo?.city,
      browser: parser.getBrowser()?.name,
      device: parser.getDevice()?.vendor,
      os: parser.getOS()?.name,
    };

    await this.newsletterService.subscribe(email, requestUser);
  }

  /* Unsubscribe from newsletter */
  @Delete('unsubscribe/:verificationToken')
  async unsubscribe(@Param('verificationToken') verificationToken: string) {
    this.newsletterService.unsubscribe(verificationToken);
  }
}
