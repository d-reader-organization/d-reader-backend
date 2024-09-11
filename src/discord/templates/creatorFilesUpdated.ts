import { MessagePayload, APIEmbed } from 'discord.js';
import { getPublicUrl } from '../../aws/s3client';
import { CreatorFile } from '../dto/types';

export const CREATOR_FILES_UPDATED = (
  name: string,
  payload: MessagePayload,
  files: CreatorFile[],
): MessagePayload => {
  const embeds: APIEmbed[] = files.map((file) => {
    return {
      title: file.type,
      color: 0x4caf50,
      image: { url: getPublicUrl(file.value) },
    };
  });

  payload.body = {
    content: `✍️ Creator "${name}" has updated their files`,
    embeds,
  };
  return payload;
};
