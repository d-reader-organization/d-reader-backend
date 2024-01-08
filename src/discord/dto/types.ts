import { ChatInputCommandInteraction, User } from 'discord.js';
import { CreatorFileProperty } from '../../creator/dto/types';
import { GetSignedComicParams } from './sign-comics-params.dto';

export type CreatorFile = {
  type?: CreatorFileProperty;
  value?: string;
};

export type GetSignedComicCommandParams = GetSignedComicParams & {
  user: User;
  interaction: ChatInputCommandInteraction;
};
