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
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from '@prisma/client';
import { UserAuth } from 'src/guards/user-auth.guard';
import { Pagination } from 'src/types/pagination.dto';
import { UserEntity } from 'src/decorators/user.decorator';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { toUserNotificationsDtoArray } from './dto/user-notification.dto';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(ThrottlerGuard)
@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

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

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(+id, updateNotificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.remove(+id);
  }
}
