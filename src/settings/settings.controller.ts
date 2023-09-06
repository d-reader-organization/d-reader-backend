import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  GlobalStatusDto,
  toGlobalStatus,
  toGlobalStatusArray,
} from './dto/global-status.dto';
import { SettingsService } from './settings.service';
import { CreateGlobalStatusDto } from './dto/create-global-status.dto';
import { UpdateGlobalStatusDto } from './dto/update-global-status.dto';
import { toSplToken, toSplTokenArray } from './dto/spl-token.dto';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from 'src/guards/roles.guard';

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

  @Post('global-status/create')
  async createGlobalStatus(
    @Body() createGlobalStatusDto: CreateGlobalStatusDto,
  ): Promise<GlobalStatusDto> {
    const globalStatus = await this.settingService.createGlobalStatus(
      createGlobalStatusDto,
    );
    return toGlobalStatus(globalStatus);
  }

  @Patch('global-status/:id/update')
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

  @Get('token-list')
  async getTokenList() {
    const tokenList = await this.settingService.getTokenList();
    return toSplTokenArray(tokenList);
  }

  @AdminGuard()
  @ApiConsumes('multipart/form-data')
  @ApiFile('icon')
  @UseInterceptors(FileInterceptor('icon'))
  @Patch('update/:id/token-icon')
  async updateTokenIcon(
    @Param('id') id: string,
    @UploadedFile() icon: Express.Multer.File,
  ) {
    const token = await this.settingService.updateTokenIcon(+id, icon);
    return toSplToken(token);
  }
}
