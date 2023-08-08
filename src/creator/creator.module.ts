import { Module } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { CreatorController } from './creator.controller';
import { UserCreatorService } from './user-creator.service';
import { PasswordService } from '../auth/password.service';

@Module({
  controllers: [CreatorController],
  providers: [CreatorService, UserCreatorService, PasswordService],
})
export class CreatorModule {}
