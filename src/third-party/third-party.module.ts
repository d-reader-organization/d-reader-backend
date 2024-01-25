import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  exports: [FirebaseModule],
})
export class ThirdPartyModule {}
