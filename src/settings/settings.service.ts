import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateGlobalStatusDto } from './dto/create-global-status.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalStatus() {
    return await this.prisma.globalStatus.findMany({
      where: { expiresAt: null },
    });
  }

  async createGlobalStatus(globalStatusDto: CreateGlobalStatusDto) {
    // TODO v2: this should also emit a ws event to clients
    return await this.prisma.globalStatus.create({
      data: {
        type: globalStatusDto.type,
        message: globalStatusDto.message,
      },
    });
  }

  async removeGlobalStatus(id: number) {
    return await this.prisma.globalStatus.update({
      where: { id },
      data: { expiresAt: new Date() },
    });
  }

  async getSupportedSplTokens() {
    return await this.prisma.splToken.findMany({
      orderBy: { priority: 'asc' },
    });
  }
}
