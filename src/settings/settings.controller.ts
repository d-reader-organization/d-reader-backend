import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  GlobalStatusDto,
  toGlobalStatus,
  toGlobalStatusArray,
} from './dto/global-status.dto';
import { SettingsService } from './settings.service';
import { CreateGlobalStatusDto } from './dto/create-global-status.dto';
import { toSplTokenArray } from './dto/spl-token.dto';
import { CacheInterceptor } from 'src/cache/cache.interceptor';
import { hours } from '@nestjs/throttler';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingService: SettingsService) {}

  @Get('global-status/get')
  async getGlobalStatus(): Promise<GlobalStatusDto[]> {
    const globalStatus = await this.settingService.getGlobalStatus();
    return toGlobalStatusArray(globalStatus);
  }

  @Post('global-status/create')
  async createGlobalStatus(
    @Body() createGlobalStatusDto: CreateGlobalStatusDto,
  ): Promise<GlobalStatusDto> {
    const globalStatus = await this.settingService.createGlobalStatus(
      createGlobalStatusDto,
    );
    return toGlobalStatus(globalStatus);
  }

  @Patch('global-status/:id/remove')
  async updateGlobalStatus(@Param('id') id: string) {
    const globalStatus = await this.settingService.removeGlobalStatus(+id);
    return toGlobalStatus(globalStatus);
  }

  /** Get a list of supported SPL tokens */
  @UseInterceptors(CacheInterceptor({ ttl: hours(12) }))
  @Get('spl-token/get')
  async getSupportedSplTokens() {
    const tokenList = await this.settingService.getSupportedSplTokens();
    return toSplTokenArray(tokenList);
  }
}
