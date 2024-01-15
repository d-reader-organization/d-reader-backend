import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { PrismaService } from 'nestjs-prisma';
import { Notification } from '@prisma/client';
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

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  remove(id: number) {
    return `This action removes a #${id} notification`;
  }
}
