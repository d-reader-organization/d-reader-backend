import { CreatorFileProperty } from '../creator/dto/types';
import { CreatorFile } from '../discord/dto/types';
import { BadRequestException } from '@nestjs/common';
import { SignComicCommandParams } from '../discord/dto/types';
import { isSolanaAddress } from 'src/decorators/IsSolanaAddress';

export const findCreatorFile = (
  files: CreatorFile[],
  type: CreatorFileProperty,
) => {
  const file = files.find((file) => file.type === type);
  return file ? file.value : undefined;
};

export const validateSignComicCommandParams = (
  params: SignComicCommandParams,
) => {
  const { address, user } = params;
  if (!user) {
    throw new BadRequestException('User initiated the command is invalid');
  } else if (!isSolanaAddress(address)) {
    throw new BadRequestException('Please provide a valid NFT address.');
  }
};
