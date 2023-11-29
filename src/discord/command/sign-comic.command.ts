import { Command, Handler, InteractionEvent } from '@discord-nestjs/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Metaplex } from '@metaplex-foundation/js';
import { initMetaplex } from '../../utils/metaplex';
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import { ComicStateArgs } from 'dreader-comic-verse';
import { decodeTransaction } from '../../utils/transactions';
import { SignComicParams } from '../dto/sign-comics-params.dto';
import { TransactionService } from '../../transactions/transaction.service';
import { PrismaService } from 'nestjs-prisma';
import { fetchOffChainMetadata } from '../../utils/nft-metadata';
import { UserSlashCommandPipe } from '../../pipes/user-slash-command-pipe';

@Command({
  name: 'sign-comic',
  description: 'Sign the Comic',
})
@Injectable()
export class SignComicCommnad {
  private readonly transactionService: TransactionService;
  private readonly metaplex: Metaplex;
  private readonly prisma: PrismaService;
  constructor() {
    this.metaplex = initMetaplex();
  }

  @Handler()
  async onSignComic(
    @InteractionEvent(UserSlashCommandPipe) options: SignComicParams,
  ): Promise<string> {
    try {
      const publicKey = this.metaplex.identity().publicKey;
      const { address } = options;
      if (!PublicKey.isOnCurve(new PublicKey(address))) {
        throw new BadRequestException(
          'Please provide a valid Comic NFT address.',
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
      console.error(
        'Error signing comic, make sure authorized creator is the signer',
        e,
      );
    }
  }
}
