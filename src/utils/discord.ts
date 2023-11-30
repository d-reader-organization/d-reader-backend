import { PublicKey } from '@metaplex-foundation/js';
import { CreatorFileProperty } from '../creator/dto/types';
import { CreatorFile } from '../discord/dto/types';
import { BadRequestException } from '@nestjs/common';
import { SignComicCommandParams } from '../discord/dto/types';

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
  } else if (!address || !PublicKey.isOnCurve(new PublicKey(address))) {
    throw new BadRequestException('Please provide a valid Comic NFT address.');
  }
};
