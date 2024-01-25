import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification, UserNotification } from '@prisma/client';
import { UserAuth } from 'src/guards/user-auth.guard';
import { Pagination } from 'src/types/pagination.dto';
import { UserEntity } from 'src/decorators/user.decorator';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { toUserNotificationsDtoArray } from './dto/user-notification.dto';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FirebaseService } from 'src/third-party/firebase/firebase.service';
import { SendMessageToTopicDto } from './dto/send-notification-to-topic.dto';
import { SendMessageToDevicesDto } from './dto/send-notification-to-devices.dto';
import { AdminGuard } from 'src/guards/roles.guard';

@UseGuards(ThrottlerGuard)
@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get('get')
  findAll(@Query() query: Pagination): Promise<Notification[]> {
    return this.notificationService.findAll(query);
  }

  @UserAuth()
  @Get('get/user')
  async findUserNotifications(@UserEntity() user: UserPayload) {
    const userNotifications =
      await this.notificationService.findUserNotifications(user.id);
    return toUserNotificationsDtoArray(userNotifications);
  }

  @UserAuth()
  @Patch('read/:notificationId')
  async read(
    @Param('notificationId') notificationId: number,
    @UserEntity() user: UserPayload,
  ): Promise<UserNotification> {
    return await this.notificationService.read({
      notificationId,
      userId: user.id,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.notificationService.remove(id);
  }

  @AdminGuard()
  @Post('send-to-topic')
  async sendMessageToTopic(@Body() sendMessageTopicDto: SendMessageToTopicDto) {
    return this.firebaseService.sendMessageToTopic(sendMessageTopicDto);
  }

  @AdminGuard()
  @Post('send-to-devices')
  async sendMessageToDevices(@Body() input: SendMessageToDevicesDto) {
    return this.firebaseService.sendMessageToDevices(input);
  }
}
