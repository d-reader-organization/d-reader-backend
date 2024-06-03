import { Module } from '@nestjs/common';
import { NonceService } from './nonce.service';

@Module({
  providers: [NonceService],
})
export class NonceModule {}
