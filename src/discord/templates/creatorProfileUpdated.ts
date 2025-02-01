import { CreatorChannel } from '@prisma/client';
import { bold, MessagePayload } from 'discord.js';
import { embedsForUpdateNotification } from '../utils';
import { DiscordKey } from '../dto/enums';
import { DISCORD_KEY_SEPARATOR } from '../dto/constants';

export const CREATOR_PROFILE_UPDATED = ({
  oldCreator,
  updatedCreator,
  hyperlink,
  payload,
}: {
  oldCreator: CreatorChannel;
  updatedCreator: CreatorChannel;
  hyperlink: string;
  payload: MessagePayload;
}): MessagePayload => {
  payload.body = {
    content: `✍️ ${bold(oldCreator.handle)} (${
      updatedCreator.verifiedAt ? 'verified' : 'unverified'
    }) creator profile updated! [Details](${hyperlink})`,
    embeds: [
      embedsForUpdateNotification<CreatorChannel>({
        title: DiscordKey.Creator + DISCORD_KEY_SEPARATOR + updatedCreator.id,
        oldData: oldCreator,
        updatedData: updatedCreator,
      }),
    ],
  };
  return payload;
};
