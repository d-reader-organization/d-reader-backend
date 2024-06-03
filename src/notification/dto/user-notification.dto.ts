import { IsBoolean, IsString } from 'class-validator';
import { UserNotificationReturnType } from '../types';
import { plainToInstance } from 'class-transformer';

export class UserNotificationDto {
  @IsString()
  body: string;

  @IsString()
  title: string;

  @IsBoolean()
  isRead: boolean;
}

export function toUserNotificationDto(
  userNotification: UserNotificationReturnType,
) {
  const plainNotificationDto = {
    body: userNotification.notification.body,
    title: userNotification.notification.title,
    isRead: !!userNotification.readAt,
  };
  const notificationDto = plainToInstance(
    UserNotificationDto,
    plainNotificationDto,
  );
  return notificationDto;
}

export const toUserNotificationsDtoArray = (
  userNotifications: UserNotificationReturnType[],
) => {
  return userNotifications.map(toUserNotificationDto);
};
