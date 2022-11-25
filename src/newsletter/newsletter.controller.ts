import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { NewsletterService } from './newsletter.service';
import {
  NewsletterDto,
  toNewsletterDto,
  toNewsletterDtoArray,
} from './dto/newsletter.dto';
import { RolesGuard } from 'src/guards/roles.guard';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { Wallet } from '@prisma/client';
import { UpsertNewsletterDto } from './dto/upsert-newsletter.dto';
import { Request } from 'src/types/request';
import { UAParser } from 'ua-parser-js';
import { RequestUserData } from '../types/request-user-data';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const geoip = require('geoip-lite');

@UseGuards(RestAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  /* Subscribe to newsletter */
  @Post('subscribe')
  async subscribe(
    @Body() upsertNewsletterDto: UpsertNewsletterDto,
    @WalletEntity() wallet: Wallet,
    @Req() request: Request,
  ): Promise<NewsletterDto> {
    const geo = geoip.lookup(request.ip);
    const parser = new UAParser(request.headers['user-agent']);

    const requestUserData: RequestUserData = {
      ip: request.ip,
      country: geo?.country,
      city: geo?.city,
      browser: parser.getBrowser()?.name,
      device: parser.getDevice()?.vendor,
      os: parser.getOS()?.name,
    };

    const newsletter = await this.newsletterService.subscribe(
      wallet.address,
      upsertNewsletterDto,
      requestUserData,
    );
    return await toNewsletterDto(newsletter);
  }

  /* Get all newsletter subscriptions */
  @Get('get')
  async findAll(): Promise<NewsletterDto[]> {
    const newsletters = await this.newsletterService.findAll();
    return await toNewsletterDtoArray(newsletters);
  }

  /* Get specific newsletter subscription by wallet address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<NewsletterDto> {
    const newsletter = await this.newsletterService.findOne(address);
    return await toNewsletterDto(newsletter);
  }

  /* Unsubscribe from newsletter */
  @Delete('unsubscribe')
  async unsubscribe(@WalletEntity() wallet: Wallet): Promise<NewsletterDto> {
    return await this.newsletterService.unsubscribe(wallet.address);
  }
}
