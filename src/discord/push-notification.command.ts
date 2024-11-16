import { Command, Handler, IA } from '@discord-nestjs/core';
import { UserSlashCommandPipe } from '../pipes/user-slash-command-pipe';
import { SkipThrottle } from '@nestjs/throttler';
import { PushNotificationDiscordDto } from 'src/notification/dto/send-notification-to-topic.dto';
import { FirebaseService } from 'src/third-party/firebase/firebase.service';
import { TopicName } from 'src/notification/types';
import {
  ChatInputCommandInteraction,
  InteractionReplyOptions,
} from 'discord.js';
import { UseGuards } from '@nestjs/common/decorators/core';
import { PushNotificationGuard } from 'src/guards/discord.guard';
import { SKIP_THROTTLERS_CONFIG } from 'src/constants';

@SkipThrottle(SKIP_THROTTLERS_CONFIG)
@Command({
  name: 'push-notification',
  description: 'Send push notification to all devices',
})
export class PushNotificationCommand {
  constructor(private readonly firebaseService: FirebaseService) {
    this.firebaseService = firebaseService;
  }

  @Handler()
  @UseGuards(PushNotificationGuard)
  async onPushNotification(
    @IA(UserSlashCommandPipe) options: PushNotificationDiscordDto,
  ): Promise<InteractionReplyOptions> {
    const params = options as PushNotificationDiscordDto & {
      interaction: ChatInputCommandInteraction;
    };
    const { interaction } = params;
    const [key, value] = options.data.split(':');
    await this.firebaseService.sendMessageToTopic({
      notification: {
        body: options.body,
        title: options.title,
      },
      topic: TopicName.broadcastTopic,
      data: {
        [key]: value,
      },
    });
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp({
      content: 'Notification has been sent!',
    });
    return;
  }
}
