import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateGlobalStatusDto } from './dto/create-global-status.dto';
import { UpdateGlobalStatusDto } from './dto/update-global-status.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalStatus() {
    return await this.prisma.globalStatus.findMany({
      where: { expiresAt: null },
    });
  }

  async createGlobalStatus(globalStatusDto: CreateGlobalStatusDto) {
    return await this.prisma.globalStatus.create({
      data: {
        type: globalStatusDto.type,
        message: globalStatusDto.message,
      },
    });
  }

  async updateGlobalStatus(id: number, update: UpdateGlobalStatusDto) {
    return await this.prisma.globalStatus.update({
      where: { id },
      data: {
        message: update.message,
        expiresAt: update.isExpired ? new Date() : null,
      },
    });
  }

  async getTokenList() {
    return await this.prisma.splToken.findMany({
      orderBy: { priority: 'asc' },
    });
  }
}
