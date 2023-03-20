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
import {
  HeliusWebhookDto,
  toHeliusWebhookDto,
  toHeliusWebhookDtoArray,
} from './dto/helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { HeliusService } from './helius.service';

// TODO: add authHeaders property handling for webhooks
// add SuperAdmin and Admin RoleGuards in helius.guard.ts
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

  /* Get all webhooks */
  @Get('get')
  async findAll(): Promise<HeliusWebhookDto[]> {
    const webhooks = await this.heliusService.findAll();
    return toHeliusWebhookDtoArray(webhooks);
  }

  /* Get first webhook */
  @Get('get/first')
  async findFirst(): Promise<HeliusWebhookDto> {
    const webhook = await this.heliusService.findFirst();
    return toHeliusWebhookDto(webhook);
  }

  /* Get specific webhook by unique id */
  @Get('get/:id')
  async findOne(@Param('id') id: string): Promise<UpdateHeliusWebhookDto> {
    const webhook = await this.heliusService.findOne(id);
    return toHeliusWebhookDto(webhook);
  }

  /* Update specific webhook */
  @Patch('update/:id')
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
