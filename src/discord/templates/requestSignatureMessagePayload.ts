import {
  APIActionRowComponent,
  APIMessageActionRowComponent,
  MessagePayload,
} from 'discord.js';

type RequestSignatureArgs = {
  [Key in 'content' | 'imageUrl' | 'nftName' | 'rarity']: string;
} & {
  payload: MessagePayload;
  components?: APIActionRowComponent<APIMessageActionRowComponent>[];
  mentionedUsers?: string[];
};

export const RequestSignatureMessagePayload = ({
  content,
  payload,
  imageUrl,
  nftName,
  rarity,
  components,
  mentionedUsers,
}: RequestSignatureArgs): MessagePayload => {
  payload.body = {
    components,
    content,
    allowed_mentions: { users: mentionedUsers },
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
  return payload;
};
