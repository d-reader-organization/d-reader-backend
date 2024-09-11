import { Creator } from '@prisma/client';
import { MessagePayload } from 'discord.js';
import { format } from 'date-fns';
import { D_PUBLISHER_LINKS } from '../../utils/client-links';

export const CREATOR_REGISTERED = (
  creator: Creator,
  payload: MessagePayload,
): MessagePayload => {
  payload.body = {
    embeds: [
      {
        title: `creator: ${creator.slug}`,
        description: 'A new creator has registered. Here are the details:',
        color: 0x4caf50,
        fields: [
          {
            name: 'Name',
            value: creator.name,
            inline: false,
          },
          {
            name: 'Email',
            value: creator.email,
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
