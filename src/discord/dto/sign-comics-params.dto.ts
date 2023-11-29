import { Param } from '@discord-nestjs/core';
export class SignComicParams {
  @Param({ description: 'Address of comic nft', required: true })
  address: string;
}
