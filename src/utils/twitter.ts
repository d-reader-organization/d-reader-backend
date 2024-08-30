import { removeTwitter } from './helpers';
import {
  ComicMintedTweetArgs,
  IssueSpotlightTweetArgs,
} from '../types/twitter';
import { isEmpty, kebabCase } from 'lodash';

// Get tweet content for comic mint
export function getComicMintTweetContent(args: ComicMintedTweetArgs) {
  const twitterIntentPrefix = 'https://x.com/intent/tweet?text=';

  const titleLine = `I just minted a ${args.comicAssetRarity} '${args.comicTitle}: ${args.comicIssueTitle}' comic on @dReaderApp! 🔥`;

  const creatorLine = `✍️ story by ${args.creatorName} `;
  const coverArtistLine = `🖌️ cover by ${args.coverArtistName}`;

  const mintLinkCallToActionLine = 'Mint yours here! 👇';
  const mintLinkLine = `https://dreader.app/mint/${args.comicSlug}_${args.comicIssueSlug}?ref=${args.source}`;

  const tweetText = encodeURI(
    `${twitterIntentPrefix}${titleLine}\n\n${creatorLine}\n${coverArtistLine}\n\n${mintLinkCallToActionLine}\n${mintLinkLine}`,
  );

  return tweetText;
}

// Get tweet content for comic issue spotlight
export function getIssueSpotlightTweetContent(args: IssueSpotlightTweetArgs) {
  const {
    creatorTwitter,
    comicTitle,
    creatorName,
    flavorText,
    previewPageCount,
  } = args;
  const twitterIntentPrefix = 'https://x.com/intent/tweet?text=';
  const creatorHandle = removeTwitter(creatorTwitter);
  const creatorTag = isEmpty(creatorHandle) ? creatorName : creatorHandle;

  const titleLine = `Creator Spotlight Day!! ⚡`;
  const shoutOutLine = `Shoutout to @${creatorTag} and their comic series,${comicTitle}.`;
  const personalizedText = `<INSERT SOMETHING PERSONAL>`;

  const comicLinkCallToActionLine = `Link below 🔗👇`;
  const comicLinkLine = `https://dreader.app/comic/${kebabCase(comicTitle)}`;
  const endOfTweet = `You can read the first ${previewPageCount} pages in-app now!\n\nShow it some love if you can and give both @${creatorTag} and ${comicTitle} series a LIKE, some STARS, and a FOLLOW on there!`;

  const tweetText = encodeURI(
    `${twitterIntentPrefix}${titleLine}\n\n${shoutOutLine}\n${flavorText}\n\n${personalizedText}\n\n${endOfTweet}\n\n${comicLinkCallToActionLine}\n${comicLinkLine}`,
  );

  return tweetText;
}
