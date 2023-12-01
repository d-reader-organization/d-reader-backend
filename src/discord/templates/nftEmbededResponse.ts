import { InteractionReplyOptions } from 'discord.js';

type NftEmbededArgs = {
  [Key in 'content' | 'imageUrl' | 'nftName' | 'rarity']: string;
};

export const NFT_EMBEDDED_RESPONSE = ({
  content,
  imageUrl,
  nftName,
  rarity,
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
  };
};
