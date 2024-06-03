import { Param } from '@discord-nestjs/core';
export class GetSignedComicParams {
  @Param({ description: 'Address of comic nft', required: true })
  address: string;
}
