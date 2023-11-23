import { MessagePayload, APIEmbed } from 'discord.js';
import { getPublicUrl } from '../../../aws/s3client';
import { CreatorFiles } from '../dto/types';

export const CREATOR_FILES_UPDATED = (
  name: string,
  payload: MessagePayload,
  files: CreatorFiles,
): MessagePayload => {
  const { avatar, banner, logo } = files;
  const embeds: APIEmbed[] = [];
  if (avatar) {
    embeds.push({
      title: 'Avatar',
      color: 0x4caf50,
      image: { url: getPublicUrl(avatar) },
    });
  }
  if (banner) {
    embeds.push({
      title: 'Banner',
      color: 0x0000ff,
      image: { url: getPublicUrl(banner) },
    });
  }
  if (logo) {
    embeds.push({
      title: 'Logo',
      color: 0xff0000,
      image: { url: getPublicUrl(logo) },
    });
  }
  payload.body = {
    content: `Creator "${name}" has updated their files`,
    embeds,
  };
  return payload;
};
