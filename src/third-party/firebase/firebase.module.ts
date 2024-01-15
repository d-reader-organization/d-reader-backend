import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { FirebaseController } from './firebase.controller';

@Module({
  controllers: [FirebaseController],
  providers: [FirebaseService],
})
export class FirebaseModule {}
