import { Prisma } from '@prisma/client';
import { MessagePayload } from 'discord.js';

export const CREATOR_REGISTERED = (
  creator: Prisma.CreatorCreateInput,
  apiUrl: string,
  payload: MessagePayload,
): MessagePayload => {
  payload.body = {
    embeds: [
      {
        title: '🚀 New Creator Registration',
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
            name: 'Registration Time',
            value: creator.createdAt.toString(),
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
