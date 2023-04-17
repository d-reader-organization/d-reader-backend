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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EnrichedTransaction } from 'helius-sdk';
import {
  HeliusWebhookDto,
  toHeliusWebhookDto,
  toHeliusWebhookDtoArray,
} from './dto/helius-webhook.dto';
import { UpdateHeliusWebhookDto } from './dto/update-helius-webhook.dto';
import { HeliusService } from './helius.service';
import { Roles, RolesGuard } from '../../guards/roles.guard';
import { RestAuthGuard } from '../../guards/rest-auth.guard';
import { WebhookGuard } from '../../guards/webhook.guard';
import { Role } from '@prisma/client';

@ApiBearerAuth('JWT-auth')
@ApiTags('Helius')
@Controller('helius')
export class HeliusController {
  constructor(private readonly heliusService: HeliusService) {}

  /* Get all webhooks */
  @UseGuards(RestAuthGuard)
  @Get('get')
  async findAll(): Promise<HeliusWebhookDto[]> {
    const webhooks = await this.heliusService.findAll();
    return toHeliusWebhookDtoArray(webhooks);
  }

  /* Get main webhook by unique id */
  @UseGuards(RestAuthGuard)
  @Get('get-main')
  async findOne(): Promise<UpdateHeliusWebhookDto> {
    const webhook = await this.heliusService.findOne();
    return toHeliusWebhookDto(webhook);
  }

  /* Update specific webhook */
  @UseGuards(RestAuthGuard, RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
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
  @Post('handle')
  async handle(@Body() enrichedTransactions: EnrichedTransaction[]) {
    await this.heliusService.handleWebhookEvent(enrichedTransactions);
  }

  /* Delete specific webhook */
  @UseGuards(RestAuthGuard, RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<boolean> {
    return await this.heliusService.deleteWebhook(id);
  }
}
