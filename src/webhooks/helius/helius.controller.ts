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
import { EnrichedTransaction } from 'helius-sdk';
import { CreateHeliusCollectionWebhookDto } from './dto/create-helius-collection-webhook.dto';
import { CreateHeliusWebhookDto } from './dto/create-helius-webhook.dto';
import { HeliusWebhookDto, toHeliusWebhookDto } from './dto/helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { HeliusService } from './helius.service';

// TODO: add authHeaders property handling for webhooks
@ApiTags('Helius')
@Controller('helius')
export class HeliusController {
  constructor(private readonly heliusService: HeliusService) {}

  /* Create a new Helius webhook */
  @Post('create')
  async create(
    @Body() createWebhookDto: CreateHeliusWebhookDto,
  ): Promise<HeliusWebhookDto> {
    const webhook = await this.heliusService.createWebhook(createWebhookDto);
    return toHeliusWebhookDto(webhook);
  }

  /* Create a new Helius collection webhook */
  @Post('create-collection')
  async createCollectionWebhook(
    @Body() createWebhookDto: CreateHeliusCollectionWebhookDto,
  ): Promise<HeliusWebhookDto> {
    const webhook = await this.heliusService.createCollectionWebhook(
      createWebhookDto,
    );
    return toHeliusWebhookDto(webhook);
  }

  /* Get specific webhook by unique id */
  @Get('get/:id')
  async getMyWebhook(@Param('id') id: string): Promise<HeliusWebhookDto> {
    const webhook = await this.heliusService.getMyWebhook(id);
    return toHeliusWebhookDto(webhook);
  }

  /* Update specific webhook */
  @Patch('update/:id')
  // TODO: protect these routes with Superadmin roles
  async updateWebhook(
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateHeliusWebhookDto,
  ): Promise<HeliusWebhookDto> {
    const webhook = await this.heliusService.updateWebhook(
      id,
      updateWebhookDto,
    );
    return toHeliusWebhookDto(webhook);
  }

  /* Receive data from webhooks */
  @Post('handle')
  async handle(@Body() enrichedTransactions: EnrichedTransaction[]) {
    await this.heliusService.handleWebhookEvent(enrichedTransactions);
  }

  /* Delete specific webhook */
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<boolean> {
    return await this.heliusService.deleteWebhook(id);
  }
}
