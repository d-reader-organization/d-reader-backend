import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BlinkService } from './blink.service';
import { toActionSpecDto } from './dto/action-spec.dto';

@UseGuards(ThrottlerGuard)
@ApiTags('Blink')
@Controller('blink')
export class BlinkController {
  constructor(private readonly blinkService: BlinkService) {}

  @Get('/action-spec/mint/:id')
  async getMintActionSpec(@Param('id') id: number) {
    const mintActionSpec = await this.blinkService.getMintActionSpec(id);
    return toActionSpecDto(mintActionSpec);
  }
}
