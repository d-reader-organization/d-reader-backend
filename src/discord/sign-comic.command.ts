import { Command, Handler, InteractionEvent } from '@discord-nestjs/core';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Metaplex } from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import { ComicStateArgs } from 'dreader-comic-verse';
import { decodeTransaction } from '../utils/transactions';
import { TransactionService } from '../transactions/transaction.service';
import { PrismaService } from 'nestjs-prisma';
import { fetchOffChainMetadata } from '../utils/nft-metadata';
import { UserSlashCommandPipe } from '../pipes/user-slash-command-pipe';
import { validateSignComicCommandParams } from '../utils/discord';
import { SignComicParams } from './dto/sign-comics-params.dto';
import { SignComicCommandParams } from './dto/types';

@Command({
  name: 'sign-comic',
  description: 'Sign the Comic',
})
@Injectable()
export class SignComicCommand {
  private readonly transactionService: TransactionService;
  private readonly metaplex: Metaplex;
  private readonly prisma: PrismaService;

  constructor() {
    this.metaplex = metaplex;
  }

  @Handler()
  async onSignComic(
    @InteractionEvent(UserSlashCommandPipe)
    options: SignComicParams,
  ): Promise<string> {
    try {
      const params = options as SignComicCommandParams;
      validateSignComicCommandParams(params);

      const publicKey = this.metaplex.identity().publicKey;
      const { address, user } = params;
      const creator = await this.prisma.creator.findFirst({
        where: {
          discord: user.username,
          comics: {
            some: {
              issues: {
                some: {
                  collectionNft: { collectionItems: { some: { address } } },
                },
              },
            },
          },
        },
      });

      if (creator?.discord !== user.username) {
        throw new UnauthorizedException(
          "You're unauthorized to sign this comic",
        );
      }
      const rawTransaction =
        await this.transactionService.createChangeComicStateTransaction(
          new PublicKey(address),
          publicKey,
          ComicStateArgs.Sign,
        );

      const transaction = decodeTransaction(rawTransaction, 'base64');
      await sendAndConfirmTransaction(this.metaplex.connection, transaction, [
        this.metaplex.identity(),
      ]);
      const nft = await this.prisma.nft.findUnique({
        where: { address: address },
      });

      const metadata = await fetchOffChainMetadata(nft.uri);
      return `Congratulations 🎉! Your comic has been successfully signed: ${metadata.image}`;
    } catch (e) {
      console.error('Error signing comic', e);
    }
  }
}
