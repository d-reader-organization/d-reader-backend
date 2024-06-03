import { Module, Global } from '@nestjs/common';
import { s3Service } from './s3.service';

@Global()
@Module({
  providers: [s3Service],
  exports: [s3Service],
})
export class s3Module {}
