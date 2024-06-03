import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnrichedTransaction } from 'helius-sdk';
import {
  HeliusWebhookDto,
  toHeliusWebhookDto,
  toHeliusWebhookDtoArray,
} from './dto/helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { HeliusService } from './helius.service';
import { AdminGuard } from '../../guards/roles.guard';
import { WebhookGuard } from '../../guards/webhook.guard';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Helius')
@Controller('helius')
export class HeliusController {
  constructor(private readonly heliusService: HeliusService) {}

  /* Get all webhooks */
  @AdminGuard()
  @Get('get')
  async findAll(): Promise<HeliusWebhookDto[]> {
    const webhooks = await this.heliusService.findAll();
    return toHeliusWebhookDtoArray(webhooks);
  }

  /* Get main webhook by unique id */
  @AdminGuard()
  @Get('get-main')
  async findOne(): Promise<UpdateHeliusWebhookDto> {
    const webhook = await this.heliusService.findOne();
    return toHeliusWebhookDto(webhook);
  }

  /* Update specific webhook */
  @AdminGuard()
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
  @UseGuards(WebhookGuard)
  @SkipThrottle()
  @Post('handle')
  async handle(@Body() enrichedTransactions: EnrichedTransaction[]) {
    await this.heliusService.handleWebhookEvent(enrichedTransactions);
  }

  /* Delete specific webhook */
  @AdminGuard()
  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    await this.heliusService.deleteWebhook(id);
  }
}
