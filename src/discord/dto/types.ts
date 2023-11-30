import { User } from 'discord.js';
import { CreatorFileProperty } from '../../creator/dto/types';
import { SignComicParams } from './sign-comics-params.dto';

export type CreatorFile = {
  type?: CreatorFileProperty;
  value?: string;
};

export type SignComicCommandParams = SignComicParams & { user: User };
