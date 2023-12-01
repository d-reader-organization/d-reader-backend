import { Command, Handler, InteractionEvent } from '@discord-nestjs/core';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Metaplex } from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import { ComicStateArgs } from 'dreader-comic-verse';
import { decodeTransaction } from '../utils/transactions';
import { TransactionService } from '../transactions/transaction.service';
import { PrismaService } from 'nestjs-prisma';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../utils/nft-metadata';
import { UserSlashCommandPipe } from '../pipes/user-slash-command-pipe';
import { validateSignComicCommandParams } from '../utils/discord';
import { SignComicParams } from './dto/sign-comics-params.dto';
import { SignComicCommandParams } from './dto/types';
import { InteractionReplyOptions } from 'discord.js';
import { getPublicUrl } from '../aws/s3client';
import { NFT_EMBEDDED_RESPONSE } from './templates/nftEmbededResponse';

@Command({
  name: 'sign-comic',
  description: 'Sign the Comic',
})
@Injectable()
export class SignComicCommand {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly prisma: PrismaService,
  ) {
    this.metaplex = metaplex;
  }

  @Handler()
  async onSignComic(
    @InteractionEvent(UserSlashCommandPipe)
    options: SignComicParams,
  ): Promise<InteractionReplyOptions> {
    try {
      const params = options as SignComicCommandParams;
      validateSignComicCommandParams(params);

      const { address, user } = params;
      const creator = await this.prisma.creator.findFirst({
        where: {
          discordUsername: user.username,
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

      if (!creator) {
        throw new UnauthorizedException(
          'Creator does not have discord account connected!',
        );
      }

      if (creator.discordUsername !== user.username) {
        throw new UnauthorizedException(
          `${user.username} is not authorized to sign the comic `,
        );
      }

      const { collectionNft, ...nft } = await this.prisma.nft.findUnique({
        where: { address: address },
        include: { collectionNft: { include: { collectionItems: true } } },
      });

      const oldMetadata = await fetchOffChainMetadata(nft.uri);
      const rarity = findRarityTrait(oldMetadata);

      if (findSignedTrait(oldMetadata)) {
        return NFT_EMBEDDED_RESPONSE({
          content: `Your comic is already signed 😎 `,
          imageUrl: oldMetadata.image,
          nftName: nft.name,
          rarity,
        });
      }

      const rawTransaction =
        await this.transactionService.createChangeComicStateTransaction(
          new PublicKey(address),
          this.metaplex.identity().publicKey,
          ComicStateArgs.Sign,
        );

      const transaction = decodeTransaction(rawTransaction, 'base64');
      await sendAndConfirmTransaction(
        this.metaplex.connection,
        transaction,
        [this.metaplex.identity()],
        { commitment: 'confirmed' },
      );

      const cover = await this.prisma.statefulCover.findFirst({
        where: {
          comicIssueId: collectionNft.comicIssueId,
          isSigned: true,
          isUsed: findUsedTrait(oldMetadata),
          rarity,
        },
      });

      return NFT_EMBEDDED_RESPONSE({
        content: `Congratulations 🎉!\nYour comic has been successfully signed`,
        imageUrl: getPublicUrl(cover.image),
        nftName: nft.name,
        rarity,
      });
    } catch (e) {
      console.error('Error signing comic', e);
    }
  }
}
