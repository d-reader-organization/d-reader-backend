import { Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrivyService } from './privy.service';

@ApiTags('Privy')
@Controller('privy')
export class PrivyController {
  constructor(private readonly privyService: PrivyService) {}

  /* Webhook listener */
  @Post('webhook-listener')
  async processWebhookEvent(@Req() request: Request): Promise<any> {
    return await this.privyService.processWebhookEvent(request);
  }
}
