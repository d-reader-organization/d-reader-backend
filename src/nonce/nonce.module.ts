import { Module } from '@nestjs/common';
import { NonceService } from './nonce.service';
import { NonceController } from './nonce.controller';
import { PrismaService } from 'nestjs-prisma';

@Module({
  controllers: [NonceController],
  providers: [NonceService, PrismaService],
})
export class NonceModule {}
