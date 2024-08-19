import { CreatorFileProperty } from '../creator/dto/types';
import { CreatorFile } from '../discord/dto/types';
import { BadRequestException } from '@nestjs/common';
import { GetSignedComicCommandParams } from '../discord/dto/types';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';
import { Comic, ComicIssue } from '@prisma/client';

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

export const generateMessageAfterAdminAction = ({
  startOfTheMessage,
  prevState,
  propertyName,
}: {
  startOfTheMessage: string;
  prevState: boolean;
  propertyName: keyof Pick<Comic | ComicIssue, 'publishedAt' | 'verifiedAt'>;
}) => {
  return `${startOfTheMessage} ${!prevState ? '' : 'un'}${propertyName.replace(
    'At',
    '',
  )}`;
};
