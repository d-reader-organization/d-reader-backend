import { CreatorFileProperty } from '../creator/dto/types';
import { CreatorFile } from '../discord/dto/types';
import { BadRequestException } from '@nestjs/common';
import { GetSignedComicCommandParams } from '../discord/dto/types';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';

export const findCreatorFile = (
  files: CreatorFile[],
  type: CreatorFileProperty,
) => {
  const file = files.find((file) => file.type === type);
  return file ? file.value : undefined;
};

export const validateSignComicCommandParams = (
  params: GetSignedComicCommandParams,
) => {
  const { address, user } = params;
  if (!user) {
    throw new BadRequestException('User initiated the command is invalid');
  } else if (!isSolanaAddress(address)) {
    throw new BadRequestException('Please provide a valid NFT address.');
  }
};
