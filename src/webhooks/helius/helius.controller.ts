import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { EnrichedTransaction, Webhook } from 'helius-sdk';
import { UpdateWebhookDto } from './dto/update-helius-webhook.dto';
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

  @Patch('update/:id')
  async updateWebhook(@Param('id') id: string, @Body() body: UpdateWebhookDto): Promise<Webhook> {
    return await this.heliusService.updateWebhook(id, body);
  }

  @Post('handle')
  update(@Body() body: EnrichedTransaction[]): void {
    body.forEach(item => {
      console.log(item);
    });
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<boolean> {
    return await this.heliusService.deleteWebhook(id);
  }
}
