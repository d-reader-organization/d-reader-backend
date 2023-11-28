import { CreatorFileProperty } from '../creator/dto/types';
import { CreatorFile } from '../discord/dto/types';

export const findCreatorFile = (
  files: CreatorFile[],
  type: CreatorFileProperty,
) => {
  const file = files.find((file) => file.type === type);
  return file ? file.value : undefined;
};
