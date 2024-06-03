import { ChatInputCommandInteraction, User } from 'discord.js';
import { CreatorFileProperty } from '../../creator/dto/types';
import { GetSignedComicParams } from './sign-comics-params.dto';
import { JsonMetadata } from '@metaplex-foundation/js';

export type CreatorFile = {
  type?: CreatorFileProperty;
  value?: string;
};

export type GetSignedComicCommandParams = GetSignedComicParams & {
  user: User;
  interaction: ChatInputCommandInteraction;
};

export type ValidateAssetResponse = {
  name?: string;
  offChainMetadata?: JsonMetadata;
  error?: string;
};
