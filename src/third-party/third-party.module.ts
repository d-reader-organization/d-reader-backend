import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { GoogleAuthModule } from './google-auth/google-auth.module';

@Module({
  imports: [FirebaseModule, GoogleAuthModule],
  exports: [FirebaseModule, GoogleAuthModule],
})
export class ThirdPartyModule {}
