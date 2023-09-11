import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateGlobalStatusDto } from './dto/create-global-status.dto';
import { UpdateGlobalStatusDto } from './dto/update-global-status.dto';
import { s3Service } from '../aws/s3.service';
import { kebabCase } from 'lodash';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: s3Service,
  ) {}

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

  async updateTokenIcon(id: number, file: Express.Multer.File) {
    let token = await this.prisma.splToken.findUnique({ where: { id } });

    const S3_FOLDER = 'spl-tokens/';

    const sanitizedName = kebabCase(token.name);
    const newFileKey = await this.s3.uploadFile(S3_FOLDER, file, sanitizedName);
    const oldFileKey = token.icon;

    try {
      token = await this.prisma.splToken.update({
        where: { id },
        data: { icon: newFileKey },
      });
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return token;
  }
}
