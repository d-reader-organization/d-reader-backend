import { APIEmbedField, bold, strikethrough } from 'discord.js';
import { CreatorFileProperty } from '../../creator/dto/types';
import { BadRequestException } from '@nestjs/common';
import { CreatorFile, GetSignedComicCommandParams } from '../dto/types';
import { isSolanaAddress } from '../../decorators/IsSolanaAddress';

const keysToIgnore = ['createdAt', 'updatedAt'];

const fieldData = <T>({
  oldData,
  updatedData,
}: {
  oldData: T;
  updatedData: T;
}): APIEmbedField[] => {
  const keys = Object.keys(updatedData);
  return keys.reduce<APIEmbedField[]>((prev, curr) => {
    const oldValue = oldData[curr];
    const newValue = updatedData[curr];
    if (typeof newValue === 'object' || typeof newValue === 'undefined') {
      return prev;
    }

    if (oldValue === newValue || keysToIgnore.includes(curr)) {
      return prev;
    }
    return [
      ...prev,
      {
        name: curr.toUpperCase(),
        value: `${
          oldValue ? strikethrough(oldValue.toString()) : 'no value'
        } -> ${bold(newValue.toString())}`,
        inline: false,
      },
    ];
  }, []);
};

export const embedsForUpdateNotification = <T>({
  title,
  oldData,
  updatedData,
}: {
  title: string;
  oldData: T;
  updatedData: T;
}) => ({
  title,
  color: 0x4caf50,
  fields: fieldData<T>({
    oldData,
    updatedData,
  }),
});

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
    throw new BadRequestException('Invalid user initiated the command');
  } else if (!isSolanaAddress(address)) {
    throw new BadRequestException('Please provide a valid NFT address.');
  }
};
