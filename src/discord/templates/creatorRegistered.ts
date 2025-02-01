import { CreatorChannel } from '@prisma/client';
import { MessagePayload } from 'discord.js';
import { format } from 'date-fns';
import { D_PUBLISHER_LINKS } from '../../utils/client-links';
import { DiscordKey } from '../dto/enums';
import { DISCORD_KEY_SEPARATOR } from '../dto/constants';

export const CREATOR_REGISTERED = (
  creator: CreatorChannel,
  payload: MessagePayload,
): MessagePayload => {
  payload.body = {
    embeds: [
      {
        title: DiscordKey.Creator + DISCORD_KEY_SEPARATOR + creator.id,
        description: 'A new creator has registered. Here are the details:',
        color: 0x4caf50,
        fields: [
          {
            name: 'Handle',
            value: creator.handle,
            inline: false,
          },
          {
            name: 'Registered on',
            value: format(creator.createdAt, 'dd-MM-yyyy'),
            inline: false,
          },
        ],
        footer: {
          text: 'dPublisher',
          icon_url: D_PUBLISHER_LINKS.logo,
        },
      },
    ],
  };
  return payload;
};
