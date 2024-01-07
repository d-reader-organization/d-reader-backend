import {
  APIActionRowComponent,
  APIMessageActionRowComponent,
  ActionRowData,
  InteractionReplyOptions,
  JSONEncodable,
  MessageActionRowComponentBuilder,
  MessageActionRowComponentData,
} from 'discord.js';

type InteractionComponent = (
  | JSONEncodable<APIActionRowComponent<APIMessageActionRowComponent>>
  | ActionRowData<
      MessageActionRowComponentData | MessageActionRowComponentBuilder
    >
  | APIActionRowComponent<APIMessageActionRowComponent>
)[];

type NftEmbededArgs = {
  [Key in 'content' | 'imageUrl' | 'nftName' | 'rarity']: string;
} & {
  ephemeral?: boolean;
  components?: InteractionComponent;
};

export const NFT_EMBEDDED_RESPONSE = ({
  content,
  imageUrl,
  nftName,
  rarity,
  components,
  ephemeral,
}: NftEmbededArgs): InteractionReplyOptions => {
  return {
    content,
    embeds: [
      {
        image: { url: imageUrl },
        fields: [
          {
            name: 'Comic Name',
            value: nftName,
            inline: true,
          },
          {
            name: 'Rarity',
            value: rarity,
            inline: true,
          },
        ],
      },
    ],
    components,
    ephemeral,
  };
};
