import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { EnrichedTransaction, Webhook } from 'helius-sdk';
import { HeliusService } from './helius.service';

@Controller('helius')
export class HeliusController {
  constructor(private readonly heliusService: HeliusService) {}

  @Get('create')
  async create(): Promise<Webhook> {
    return await this.heliusService.createWebhook();
  }

  @Get('get/:id')
  async getMyWebhook(@Param('id') id: string): Promise<Webhook> {
    return await this.heliusService.getMyWebhook(id);
  }

  @Post('handle')
  update(@Body() body: EnrichedTransaction): void {
    try {
      body[0].instructions.forEach((i) => {
        console.log(i);
      });
    } catch (e) {
      console.log(e);
    }
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<boolean> {
    return await this.heliusService.deleteWebhook(id);
  }
}
