import { Command, EventParams, Handler, IA, On } from '@discord-nestjs/core';
import {
  JsonMetadata,
  Metadata,
  Metaplex,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
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
  ButtonInteraction,
  ButtonStyle,
  ClientEvents,
  InteractionReplyOptions,
  MessageActionRowComponentBuilder,
  User,
} from 'discord.js';
import { NFT_EMBEDDED_RESPONSE } from './templates/nftEmbededResponse';
import { UseGuards } from '@nestjs/common';
import { IsSignButtonInteractionGuard } from '../guards/sign-button-interaction.guard';
import { findOurCandyMachine } from '../utils/helpers';
import { AUTH_TAG, pda } from '../candy-machine/instructions/pda';
import {
  PROGRAM_ID as COMIC_VERSE_ID,
  ComicStateArgs,
} from 'dreader-comic-verse';
import {
  delegateAuthority,
  verifyMintCreator,
} from '../candy-machine/instructions';
import { validateSignComicCommandParams } from '../utils/discord';
import { decodeTransaction } from 'src/utils/transactions';
import { getPublicUrl } from 'src/aws/s3client';
import {
  CollectionNft,
  Nft,
  StatefulCover,
  ComicRarity as PrismaComicRarity,
  Metadata as PrismaMetadata,
} from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { LOCKED_COLLECTIONS } from 'src/constants';

@SkipThrottle()
@Command({
  name: 'get-signature',
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
    const params = options as GetSignedComicCommandParams;
    const { interaction } = params;
    await interaction.deferReply({ ephemeral: true });

    let metadata: Metadata<JsonMetadata>;
    let address: string;
    let user: User;

    try {
      validateSignComicCommandParams(params);
      user = params.user;
      address = params.address;

      const metadataAddress = this.metaplex
        .nfts()
        .pdas()
        .metadata({ mint: new PublicKey(address) });

      const info = await this.metaplex
        .rpc()
        .getAccount(new PublicKey(metadataAddress));

      if (!info) {
        throw new Error(`Metadata account ${metadataAddress} doesn't exist`);
      }

      metadata = toMetadata(toMetadataAccount(info));
    } catch (e) {
      console.error('Error', e);
      return {
        content: '```fix\n Please provide a valid NFT address.```',
        ephemeral: true,
      };
    }

    const candyMachines = await this.prisma.candyMachine.findMany({
      select: { address: true },
    });
    const candyMachine = findOurCandyMachine(
      this.metaplex,
      candyMachines,
      metadata,
    );

    if (!candyMachine) {
      return {
        content:
          '```fix\n Error finding Nft, Make sure your Nft address is correct.```',
        ephemeral: true,
      };
    }
    const offChainMetadata = await fetchOffChainMetadata(metadata.uri);
    const rarity = findRarityTrait(offChainMetadata);
    const authority = pda(
      [
        Buffer.from(AUTH_TAG + rarity.toLowerCase()),
        new PublicKey(candyMachine).toBuffer(),
        metadata.collection.address.toBuffer(),
      ],
      COMIC_VERSE_ID,
    );

    if (!metadata.updateAuthorityAddress.equals(authority)) {
      try {
        await Promise.all([
          delegateAuthority(
            this.metaplex,
            new PublicKey(candyMachine),
            metadata.collection.address,
            rarity.toString(),
            metadata.mintAddress,
          ),
          verifyMintCreator(this.metaplex, metadata.mintAddress),
        ]);
      } catch (e) {
        console.error(e);
      }
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
      console.log(creator);
      await interaction.editReply({
        content:
          '```fix\n Creator does not exists! Make sure your nft address is correct or try running sync wallet in app``',
      });
      return;
    }

    if (!creator.discordUsername) {
      await interaction.editReply({
        content:
          '```fix\n Creator discord account verification is pending, Signing will begin soon !```',
      });
      return;
    }

    if (findSignedTrait(offChainMetadata)) {
      await interaction.followUp(
        NFT_EMBEDDED_RESPONSE({
          content: `Your comic is already signed 😎 `,
          imageUrl: offChainMetadata.image,
          nftName: metadata.name,
          rarity,
          ephemeral: true,
        }),
      );
      return;
    }

    const component =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${user.id};${address}`)
          .setLabel(`Sign Comic ✍🏼`)
          .setStyle(ButtonStyle.Success),
      );

    await interaction.editReply('All Checks done ✅');
    await interaction.followUp(
      NFT_EMBEDDED_RESPONSE({
        content: `**${user.username}** requested **${creator.discordUsername}** to sign their **${metadata.name}**`,
        imageUrl: offChainMetadata.image,
        nftName: metadata.name,
        rarity,
        components: [component],
        ephemeral: false,
      }),
    );
    return;
  }

  @On('interactionCreate')
  @UseGuards(IsSignButtonInteractionGuard)
  async onSignButtonClicked(
    @EventParams() eventArgs: ClientEvents['interactionCreate'],
  ): Promise<InteractionReplyOptions> {
    const buttonInteraction = eventArgs[0] as ButtonInteraction;
    await buttonInteraction.deferReply({ ephemeral: true });
    const user = buttonInteraction.customId.split(';')[0];
    const address = buttonInteraction.customId.split(';')[1];
    if (!user) {
      await buttonInteraction.editReply({
        content:
          '```fix\n Invalid User, Please try again or ask user to run get-signature command again !```',
      });
      return;
    }
    const creatorDiscord = buttonInteraction.user.username;
    let transactionSignature: string;
    let latestBlockhash: Readonly<{
      blockhash: string;
      lastValidBlockHeight: number;
    }>;
    let cover: StatefulCover;
    let nft: Nft & { collectionNft: CollectionNft } & {
      metadata: PrismaMetadata;
    };
    let rarity: PrismaComicRarity;
    try {
      const creator = await this.prisma.creator.findFirst({
        where: {
          discordUsername: creatorDiscord,
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
        await buttonInteraction.editReply({
          content:
            '```fix\n Unauthorized creator, Make sure your discord is verified```',
        });
        return;
      }

      nft = await this.prisma.nft.findUnique({
        where: { address: address },
        include: { collectionNft: true, metadata: true },
      });

      cover = await this.prisma.statefulCover.findFirst({
        where: {
          comicIssueId: nft.collectionNft.comicIssueId,
          isSigned: nft.metadata.isSigned,
          isUsed: nft.metadata.isUsed,
          rarity,
        },
      });

      if (nft.metadata.isSigned) {
        await buttonInteraction.editReply('All Checks done ✅');
        await buttonInteraction.followUp(
          NFT_EMBEDDED_RESPONSE({
            content: `The comic is already signed 😎 `,
            imageUrl: cover.image,
            nftName: nft.name,
            rarity,
            ephemeral: false,
          }),
        );
        return;
      }

      if (
        !LOCKED_COLLECTIONS.find(
          (collectionAddress) => nft.collectionNftAddress === collectionAddress,
        )
      ) {
        const rawTransaction =
          await this.transactionService.createChangeComicStateTransaction(
            new PublicKey(address),
            this.metaplex.identity().publicKey,
            ComicStateArgs.Sign,
          );

        const transaction = decodeTransaction(rawTransaction, 'base64');
        transactionSignature = await sendAndConfirmTransaction(
          this.metaplex.connection,
          transaction,
          [this.metaplex.identity()],
          { commitment: 'confirmed' },
        );

        latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();
      } else {
        const signedMetadata = await this.prisma.metadata.findFirst({
          where: {
            collectionName: nft.collectionNft.name,
            isSigned: true,
            isUsed: nft.metadata.isUsed,
          },
        });
        await this.prisma.nft.update({
          where: { address: nft.address },
          data: {
            metadata: { connect: { uri: signedMetadata.uri } },
          },
        });
      }

      cover = await this.prisma.statefulCover.findFirst({
        where: {
          comicIssueId: nft.collectionNft.comicIssueId,
          isSigned: true,
          isUsed: nft.metadata.isUsed,
          rarity,
        },
      });
      await buttonInteraction.editReply('All Checks done ✅');
      await buttonInteraction.followUp(
        NFT_EMBEDDED_RESPONSE({
          content: `<@${user}> got their comic signed! Amazing 🎉`,
          imageUrl: getPublicUrl(cover.image),
          nftName: nft.name,
          rarity,
          mentionedUsers: [user],
          ephemeral: false,
        }),
      );
      return;
    } catch (e) {
      if (transactionSignature) {
        const reponse = await this.metaplex
          .rpc()
          .confirmTransaction(
            transactionSignature,
            { ...latestBlockhash },
            'confirmed',
          );
        if (!reponse.value.err) {
          await buttonInteraction.editReply('All Checks done ✅');
          await buttonInteraction.followUp(
            NFT_EMBEDDED_RESPONSE({
              content: `<@${user}> got their comic signed! Amazing 🎉`,
              imageUrl: getPublicUrl(cover.image),
              nftName: nft.name,
              rarity,
              ephemeral: false,
              mentionedUsers: [user],
            }),
          );
          return;
        }
      }
      console.error('Error signing comic', e);
      await buttonInteraction.editReply({
        content: '```fix\n Error Signing, Please try again in sometime```',
      });
      return;
    }
  }
}
