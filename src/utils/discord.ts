import { CreatorFileProperty } from '../creator/dto/types';
import { CreatorFile } from '../webhooks/discord/dto/types';

export const findCreatorFile = (
  files: CreatorFile[],
  type: CreatorFileProperty,
) => {
  const file = files.find((file) => file.type === type);
  return file ? file.value : undefined;
};

export const validateEnvironment = () =>
  process.env.DISCORD_CLIENT_ID && process.env.DISCORD_WEBHOOK_TOKEN;
