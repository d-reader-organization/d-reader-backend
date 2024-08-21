import { Creator } from '@prisma/client';
import { MessagePayload } from 'discord.js';
import { format } from 'date-fns';

export const CREATOR_REGISTERED = (
  creator: Creator,
  apiUrl: string,
  payload: MessagePayload,
): MessagePayload => {
  payload.body = {
    embeds: [
      {
        title: `creator:${creator.slug}`,
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
          icon_url: `${apiUrl}/logo192.png`,
        },
      },
    ],
  };
  return payload;
};
