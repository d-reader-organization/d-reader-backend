import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { NewsletterDto, toNewsletterDtoArray } from './dto/newsletter.dto';
import { Request } from 'src/types/request';
import { UAParser } from 'ua-parser-js';
import { RequestUserData } from '../types/request-user-data';
import { RealIP } from 'nestjs-real-ip';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const geoip = require('geoip-lite');

// TODO v1: redo newslettter
@UseGuards(ThrottlerGuard)
@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  /* Subscribe to newsletter */
  @Throttle(2, 60)
  @Post('subscribe')
  async subscribe(
    @Body() newsletterDto: NewsletterDto,
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

    await this.newsletterService.subscribe(newsletterDto.email, requestUser);
  }

  /* Get all newsletter subscriptions */
  @Get('get')
  async findAll(): Promise<NewsletterDto[]> {
    const newsletters = await this.newsletterService.findAll();
    return toNewsletterDtoArray(newsletters);
  }

  /* Unsubscribe from newsletter */
  @Delete('unsubscribe')
  async unsubscribe(@Body() newsletterDto: NewsletterDto) {
    this.newsletterService.unsubscribe(newsletterDto.email);
  }
}
