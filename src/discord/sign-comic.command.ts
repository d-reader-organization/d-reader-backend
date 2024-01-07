import { Command, Handler, IA } from '@discord-nestjs/core';
import {
  JsonMetadata,
  Metadata,
  Metaplex,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { PublicKey } from '@solana/web3.js';
import { TransactionService } from '../transactions/transaction.service';
import { PrismaService } from 'nestjs-prisma';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
} from '../utils/nft-metadata';
import { UserSlashCommandPipe } from '../pipes/user-slash-command-pipe';
import { GetSignedComicParams } from './dto/sign-comics-params.dto';
import { GetSignedComicCommandParams } from './dto/types';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionReplyOptions,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { NFT_EMBEDDED_RESPONSE } from './templates/nftEmbededResponse';

@Command({
  name: 'get-sign',
  description: 'Get your comic signed',
})
export class GetSignCommand {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly prisma: PrismaService,
  ) {
    this.metaplex = metaplex;
  }

  @Handler()
  async onGetSignedComic(
    @IA(UserSlashCommandPipe) options: GetSignedComicParams,
  ): Promise<InteractionReplyOptions> {
    const { user, address } = options as GetSignedComicCommandParams;

    let metadata: Metadata<JsonMetadata>;
    try {
      const metadataAddress = this.metaplex
        .nfts()
        .pdas()
        .metadata({ mint: new PublicKey(address) });
      const info = await this.metaplex
        .rpc()
        .getAccount(new PublicKey(metadataAddress));

      if (!info) {
        throw Error(`Metdata account ${metadataAddress} doesn't exists`);
      }
      metadata = toMetadata(toMetadataAccount(info));
    } catch (e) {
      return {
        content:
          '```fix\n Error finding Nft, Make sure your Nft address is correct.``',
        ephemeral: true,
      };
    }

    const creator = await this.prisma.creator.findFirst({
      where: {
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
      return {
        content:
          '```fix\n Creator does not exists! Make sure your nft address is correct.``',
        ephemeral: true,
      };
    }

    if (!creator.discordUsername) {
      return {
        content:
          '```fix\n Creator discord account verification is pending, Signing will begin soon !```',
        ephemeral: true,
      };
    }

    const rarity = findRarityTrait(metadata);
    const offChainMetadata = await fetchOffChainMetadata(metadata.uri);

    if (findSignedTrait(metadata)) {
      return NFT_EMBEDDED_RESPONSE({
        content: `Your comic is already signed 😎 `,
        imageUrl: offChainMetadata.image,
        nftName: metadata.name,
        rarity,
        ephemeral: true,
      });
    }

    const component =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('sign')
          .setLabel(`Sign Comic ${metadata.name} ✍🏼`)
          .setStyle(ButtonStyle.Success),
      );

    return NFT_EMBEDDED_RESPONSE({
      content: `${user.username} requested ${creator.discordUsername} to sign their ${metadata.name}`,
      imageUrl: offChainMetadata.image,
      nftName: metadata.name,
      rarity,
      components: [component],
    });
  }
}
