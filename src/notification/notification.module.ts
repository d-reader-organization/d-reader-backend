import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { FirebaseService } from 'src/third-party/firebase/firebase.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, FirebaseService],
})
export class NotificationModule {}
