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
  process.env.AWS_BUCKET_NAME == 'd-reader-main-mainnet';
