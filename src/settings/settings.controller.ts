import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  GlobalStatusDto,
  toGlobalStatus,
  toGlobalStatusArray,
} from './dto/global-status.dto';
import { SettingsService } from './settings.service';
import { CreateGlobalStatusDto } from './dto/create-global-status.dto';
import { UpdateGlobalStatusDto } from './dto/update-global-status.dto';

@UseGuards(ThrottlerGuard)
@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingService: SettingsService) {}

  @Get('global-status')
  async getGlobalStatus(): Promise<GlobalStatusDto[]> {
    const globalStatus = await this.settingService.getGlobalStatus();
    return toGlobalStatusArray(globalStatus);
  }

  @Post('create-global-status')
  async createGlobalStatus(
    @Body() createGlobalStatusDto: CreateGlobalStatusDto,
  ): Promise<GlobalStatusDto> {
    const globalStatus = await this.settingService.createGlobalStatus(
      createGlobalStatusDto,
    );
    return toGlobalStatus(globalStatus);
  }

  @Patch('update-global-status/:id')
  async updateGlobalStatus(
    @Param('id') id: string,
    @Body() updateGlobalStatusDto: UpdateGlobalStatusDto,
  ) {
    const globalStatus = await this.settingService.updateGlobalStatus(
      +id,
      updateGlobalStatusDto,
    );
    return toGlobalStatus(globalStatus);
  }
}
