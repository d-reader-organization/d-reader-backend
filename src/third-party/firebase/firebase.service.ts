import { Injectable } from '@nestjs/common';
import { SendMessageToTopicDto } from './dto/send-notification-to-topic.dto';
import { messaging } from 'firebase-admin';
import { SendMessageToDevicesDto } from './dto/send-notification-to-devices.dto';

@Injectable()
export class FirebaseService {
  async sendMessageToTopic({ notification, topic }: SendMessageToTopicDto) {
    const fcm = messaging();

    await fcm.sendToTopic(topic, {
      notification: {
        body: notification.body,
        title: notification.title,
      },
    });
  }

  async sendMessageToDevices({
    deviceIds,
    notification,
  }: SendMessageToDevicesDto) {
    const fcm = messaging();
    await fcm.sendEachForMulticast({
      notification: {
        body: notification.body,
        title: notification.title,
      },
      tokens: deviceIds,
    });
  }
}
