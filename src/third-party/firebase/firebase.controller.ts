import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { SendMessageToTopicDto } from './dto/send-notification-to-topic.dto';
import { SendMessageToDevicesDto } from './dto/send-notification-to-devices.dto';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(ThrottlerGuard)
@ApiTags('Firebase')
@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post()
  async sendMessageToTopic(@Body() sendMessageTopicDto: SendMessageToTopicDto) {
    return this.firebaseService.sendMessageToTopic(sendMessageTopicDto);
  }

  @Post()
  async sendMessageToDevices(@Body() input: SendMessageToDevicesDto) {
    return this.firebaseService.sendMessageToDevices(input);
  }
}
