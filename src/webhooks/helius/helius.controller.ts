import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnrichedTransaction, Webhook } from 'helius-sdk';
import { UpdateWebhookDto } from './dto/update-helius-webhook.dto';
import { HeliusService } from './helius.service';

@ApiTags('Helius')
@Controller('helius')
export class HeliusController {
  constructor(private readonly heliusService: HeliusService) {}

  /* Create a new Helius webhook */
  @Get('create')
  async create(): Promise<Webhook> {
    return await this.heliusService.createWebhook();
  }

  /* Get specific webhook by unique id */
  @Get('get/:id')
  async getMyWebhook(@Param('id') id: string): Promise<Webhook> {
    return await this.heliusService.getMyWebhook(id);
  }

  /* Update specific webhook */
  @Patch('update/:id')
  async updateWebhook(
    @Param('id') id: string,
    @Body() body: UpdateWebhookDto,
  ): Promise<Webhook> {
    return await this.heliusService.updateWebhook(id, body);
  }

  /* Receive data from webhooks */
  @Post('handle')
  async handle(@Body() body: EnrichedTransaction[]) {
    await this.heliusService.handleWebhookEvent(body);
  }

  /* Delete specific webhook */
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<boolean> {
    return await this.heliusService.deleteWebhook(id);
  }
}
