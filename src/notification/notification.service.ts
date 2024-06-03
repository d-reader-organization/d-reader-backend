import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PrismaService } from 'nestjs-prisma';
import { Notification, UserNotification } from '@prisma/client';
import { UserNotificationReturnType } from './types';
import { Pagination } from 'src/types/pagination.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    return await this.prisma.notification.create({
      data: createNotificationDto,
    });
  }

  async findAll({ skip, take }: Pagination): Promise<Notification[]> {
    const result = await this.prisma.notification.findMany({
      skip,
      take,
    });
    return result;
  }

  async findUserNotifications(
    userId: number,
  ): Promise<UserNotificationReturnType[]> {
    const notifications = await this.prisma.userNotification.findMany({
      where: { userId },
      include: { notification: true },
    });

    return notifications;
  }

  findOne(id: number): Promise<Notification | undefined> {
    return this.prisma.notification.findFirst({ where: { id } });
  }

  async read({
    notificationId,
    userId,
  }: {
    notificationId: number;
    userId: number;
  }): Promise<UserNotification> {
    return this.prisma.userNotification.update({
      data: { readAt: new Date() },
      where: {
        userId_notificationId: {
          notificationId,
          userId,
        },
      },
    });
  }

  remove(id: number) {
    return this.prisma.notification.delete({ where: { id } });
  }
}
