import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}
  get(): string {
    return 'API connected successfully!';
  }

  getAuth(address: string): string {
    return `API connected successfully! Welcome ${address}`;
  }

  async healthCheck(): Promise<string> {
    await this.prisma.$queryRaw`SELECT 1`;
    return 'ok';
  }
}
