import { Injectable } from '@nestjs/common';
import { SendMessageToTopicDto } from '../../notification/dto/send-notification-to-topic.dto';
import { messaging } from 'firebase-admin';
import { SendMessageToDevicesDto } from '../../notification/dto/send-notification-to-devices.dto';

@Injectable()
export class FirebaseService {
  async sendMessageToTopic({
    data,
    notification,
    topic,
  }: SendMessageToTopicDto) {
    const fcm = messaging();
    await fcm.sendToTopic(topic, {
      ...(data && { data }),
      notification: {
        body: notification.body,
        title: notification.title,
        color: '#FCEB54',
      },
    });
  }

  async sendMessageToDevices({
    data,
    deviceIds,
    notification,
  }: SendMessageToDevicesDto) {
    const fcm = messaging();
    await fcm.sendEachForMulticast({
      ...(data && { data }),
      notification: {
        body: notification.body,
        title: notification.title,
      },
      tokens: deviceIds,
    });
  }
}
