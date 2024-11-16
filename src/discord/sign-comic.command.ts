import { Command, EventParams, Handler, IA, On } from '@discord-nestjs/core';
import {
  JsonMetadata,
  Metadata,
  Metaplex,
  toMetadata,
  toMetadataAccount,
} from '@metaplex-foundation/js';
import { metaplex, umi } from '../utils/metaplex';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { TransactionService } from '../transactions/transaction.service';
import { PrismaService } from 'nestjs-prisma';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
} from '../utils/nft-metadata';
import { UserSlashCommandPipe } from '../pipes/user-slash-command-pipe';
import { GetSignedComicParams } from './dto/sign-comics-params.dto';
import {
  GetSignedComicCommandParams,
  ValidateAssetResponse,
} from './dto/types';
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
import { AUTH_TAG, pda } from '../candy-machine/instructions/pda';
import {
  PROGRAM_ID as COMIC_VERSE_ID,
  ComicStateArgs,
} from 'dreader-comic-verse';
import {
  delegateAuthority,
  verifyMintCreator,
} from '../candy-machine/instructions';
import { getPublicUrl } from 'src/aws/s3client';
import {
  CollectibleComicCollection,
  CollectibleComic,
  StatefulCover,
  ComicRarity as PrismaComicRarity,
  CollectibleComicMetadata as PrismaMetadata,
  TokenStandard,
  CandyMachine,
} from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { LOCKED_COLLECTIONS, SKIP_THROTTLERS_CONFIG } from '../constants';
import { fetchAssetV1 } from '@metaplex-foundation/mpl-core';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { validateSignComicCommandParams } from './utils';

@SkipThrottle(SKIP_THROTTLERS_CONFIG)
@Command({
  name: 'get-signature',
  description: 'Get your comic signed',
})
export class GetSignCommand {
  private readonly metaplex: Metaplex;
  private readonly umi: Umi;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly prisma: PrismaService,
  ) {
    this.metaplex = metaplex;
    this.umi = umi;
  }

  @Handler()
  async onGetSignedComic(
    @IA(UserSlashCommandPipe) options: GetSignedComicParams,
  ): Promise<InteractionReplyOptions> {
    const params = options as GetSignedComicCommandParams;
    const { interaction } = params;
    await interaction.deferReply({ ephemeral: true });

    validateSignComicCommandParams(params);
    const { user, address } = params;

    const response = await this.validateAsset(address);
    if (response.error) return { content: response.error, ephemeral: true };

    const { offChainMetadata, name } = response;
    const creator = await this.prisma.creator.findFirst({
      where: {
        comics: {
          some: {
            issues: {
              some: {
                collectibleComicCollection: {
                  metadatas: {
                    some: { collectibleComics: { some: { address } } },
                  },
                },
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

    if (!creator.discordId) {
      await interaction.editReply({
        content:
          '```fix\n Creator discord account verification is pending, Signing will begin soon !```',
      });
      return;
    }

    const rarity = findRarityTrait(offChainMetadata);
    if (findSignedTrait(offChainMetadata)) {
      await interaction.followUp(
        NFT_EMBEDDED_RESPONSE({
          content: `Your comic is already signed 😎 `,
          imageUrl: offChainMetadata.image,
          nftName: name,
          rarity,
          ephemeral: true,
        }),
      );
      return;
    }

    let creatorDiscord: User;
    try {
      creatorDiscord = await interaction.client.users.fetch(creator.discordId);
    } catch (e) {
      await interaction.editReply({
        content:
          '```fix\n Creator discord account verification is pending, Signing will begin soon !```',
      });
      return;
    }

    const component =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${user.id};${address}`)
          .setLabel(`Sign comic ✍🏼`)
          .setStyle(ButtonStyle.Success),
      );

    await interaction.editReply('All checks done ✅');
    await interaction.followUp(
      NFT_EMBEDDED_RESPONSE({
        content: `**${user.username}** requested **${creatorDiscord.username}** to sign their **${name}**`,
        imageUrl: offChainMetadata.image,
        nftName: name,
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
          '```fix\n Invalid user, please try again or ask user to run get-signature command again !```',
      });
      return;
    }

    const creatorDiscordId = buttonInteraction.user.id;
    let transactionSignature: string;
    let latestBlockhash: Readonly<{
      blockhash: string;
      lastValidBlockHeight: number;
    }>;
    let cover: StatefulCover;
    let asset: CollectibleComic & {
      metadata: PrismaMetadata & { collection: CollectibleComicCollection };
    };
    let rarity: PrismaComicRarity;
    try {
      const creator = await this.prisma.creator.findFirst({
        where: {
          discordId: creatorDiscordId,
          comics: {
            some: {
              issues: {
                some: {
                  collectibleComicCollection: {
                    metadatas: {
                      some: { collectibleComics: { some: { address } } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!creator) {
        await buttonInteraction.editReply({
          content:
            '```fix\n Unauthorized creator, your Discord account is not verified```',
        });
        return;
      }

      asset = await this.prisma.collectibleComic.findUnique({
        where: { address: address },
        include: { metadata: { include: { collection: true } } },
      });
      rarity = asset.metadata.rarity;

      const collection = asset.metadata.collection;
      cover = await this.prisma.statefulCover.findFirst({
        where: {
          comicIssueId: collection.comicIssueId,
          isSigned: asset.metadata.isSigned,
          isUsed: asset.metadata.isUsed,
          rarity,
        },
      });

      if (asset.metadata.isSigned) {
        await buttonInteraction.editReply('All Checks done ✅');
        await buttonInteraction.followUp(
          NFT_EMBEDDED_RESPONSE({
            content: `The comic is already signed 😎 `,
            imageUrl: getPublicUrl(cover.image),
            nftName: asset.name,
            rarity: rarity.toString(),
            ephemeral: false,
          }),
        );
        return;
      }
      const isCollectionLocked = LOCKED_COLLECTIONS.has(collection.address);
      if (!isCollectionLocked) {
        const rawTransaction =
          await this.transactionService.createChangeComicStateTransaction(
            new PublicKey(address),
            this.metaplex.identity().publicKey,
            ComicStateArgs.Sign,
          );

        const transaction = VersionedTransaction.deserialize(
          Buffer.from(rawTransaction, 'base64'),
        );
        transaction.sign([this.metaplex.identity()]);
        const signature = await this.metaplex.connection.sendRawTransaction(
          transaction.serialize(),
        );
        await this.metaplex.connection.confirmTransaction({
          signature,
          ...latestBlockhash,
        });

        latestBlockhash = await this.metaplex.rpc().getLatestBlockhash();
      } else {
        const signedMetadata =
          await this.prisma.collectibleComicMetadata.findUnique({
            where: {
              isUsed_isSigned_rarity_collectionAddress: {
                isUsed: asset.metadata.isUsed,
                isSigned: true,
                rarity: asset.metadata.rarity,
                collectionAddress: asset.metadata.collectionAddress,
              },
            },
          });
        await this.prisma.collectibleComic.update({
          where: { address: asset.address },
          data: {
            metadata: { connect: { uri: signedMetadata.uri } },
          },
        });
      }

      cover = await this.prisma.statefulCover.findFirst({
        where: {
          comicIssueId: collection.comicIssueId,
          isSigned: true,
          isUsed: asset.metadata.isUsed,
          rarity,
        },
      });
      await buttonInteraction.editReply('All Checks done ✅');
      await buttonInteraction.followUp(
        NFT_EMBEDDED_RESPONSE({
          content: `<@${user}> got their comic signed! Amazing 🎉`,
          imageUrl: getPublicUrl(cover.image),
          nftName: asset.name,
          rarity: rarity.toString(),
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
              nftName: asset.name,
              rarity: rarity.toString(),
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

  async validateAsset(address: string): Promise<ValidateAssetResponse> {
    const candyMachine = await this.prisma.candyMachine.findFirst({
      where: {
        collection: {
          metadatas: { some: { collectibleComics: { some: { address } } } },
        },
      },
    });
    if (!candyMachine) {
      return {
        error:
          '```fix\n Error finding Nft, Make sure your Nft address is correct.```',
      };
    }

    if (candyMachine.standard === TokenStandard.Core) {
      return this.validateCoreAsset(address, candyMachine);
    }
    return this.validateLegacyAsset(address, candyMachine);
  }

  async validateCoreAsset(
    address: string,
    candyMachine: CandyMachine,
  ): Promise<ValidateAssetResponse> {
    const asset = await fetchAssetV1(this.umi, publicKey(address));
    if (
      asset.updateAuthority.address.toString() != candyMachine.collectionAddress
    ) {
      return { error: '```fix\n Asset belongs to a invalid collection.```' };
    }
    const offChainMetadata = await fetchOffChainMetadata(asset.uri);
    return { name: asset.name, offChainMetadata };
  }

  async validateLegacyAsset(
    address: string,
    candyMachine: CandyMachine,
  ): Promise<ValidateAssetResponse> {
    let metadata: Metadata<JsonMetadata>;
    try {
      const metadataAddress = this.metaplex
        .nfts()
        .pdas()
        .metadata({ mint: new PublicKey(address) });

      const info = await this.metaplex.rpc().getAccount(metadataAddress);

      if (!info) {
        throw new Error(
          `Metadata account ${metadataAddress.toString()} doesn't exist`,
        );
      }

      metadata = toMetadata(toMetadataAccount(info));
    } catch (e) {
      console.error('Error', e);
      return { error: '```fix\n Please provide a valid NFT address.```' };
    }

    const offChainMetadata = await fetchOffChainMetadata(metadata.uri);
    const rarity = findRarityTrait(offChainMetadata);
    const authority = pda(
      [
        Buffer.from(AUTH_TAG + rarity.toLowerCase()),
        new PublicKey(candyMachine.address).toBuffer(),
        metadata.collection.address.toBuffer(),
      ],
      COMIC_VERSE_ID,
    );

    if (!metadata.updateAuthorityAddress.equals(authority)) {
      try {
        await Promise.all([
          delegateAuthority(
            this.metaplex,
            new PublicKey(candyMachine.address),
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

    return { name: metadata.name, offChainMetadata };
  }
}
