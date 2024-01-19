import { Prisma } from '@prisma/client';

export type UserNotificationReturnType = Prisma.UserNotificationGetPayload<{
  include: { notification: true };
}>;

export enum TopicName {
  broadcastTopic = 'broadcast',
}
