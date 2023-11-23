import { Prisma } from '@prisma/client';
import { MessagePayload } from 'discord.js';

export const CREATOR_VERIFIED = (
  creator: Prisma.CreatorCreateInput,
  apiUrl: string,
  payload: MessagePayload,
): MessagePayload => {
  payload.body = {
    embeds: [
      {
        title: `Creator ${creator.name} has verified their email`,
        description: 'Here are the details:',
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
            name: 'Verified At',
            value: creator.emailVerifiedAt.toString(),
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
