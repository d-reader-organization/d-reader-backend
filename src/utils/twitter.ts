import { removeTwitter } from './helpers';
import {
  ComicMintedTweetArgs,
  IssueSpotlightTweetArgs,
} from '../types/twitter';
import { isEmpty } from 'lodash';

// Get tweet content for comic mint
export function getComicMintTweetContent(args: ComicMintedTweetArgs) {
  const twitterIntentPrefix = 'https://x.com/intent/tweet?text=';

  const titleLine = `I just minted a ${args.comicAssetRarity} '${args.comicTitle}: ${args.comicIssueTitle}' comic on @dReaderApp! 🔥`;

  const creatorLine = `✍️ story by @${args.creatorName} `;
  const coverArtistLine = `🖌️ cover by ${args.coverArtistName}`;

  const mintLinkCallToActionLine = 'Mint yours here while the supply lasts.👇';
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
    comicIssueTitle,
    coverArtistArray,
    creatorName,
  } = args;
  const twitterIntentPrefix = 'https://x.com/intent/tweet?text=';
  const creatorHandle = removeTwitter(creatorTwitter);
  const creatorTag = isEmpty(creatorHandle) ? creatorName : creatorHandle;

  const titleLine = `Creator Spotlight Day!! ⚡\n\n`;

  const shoutOutLine = `Shoutout to @${creatorTag} and his comic series ${comicTitle}. I cannot wait to dive into the rest of this universe!\n\nYou can read the first 3 pages of episode ${comicIssueTitle} on @dReader now! Show it some love if you can and give both @${creatorTag}, and the ${comicTitle} series a LIKE, some STARS, and a FOLLOW on there!`;

  let coverArtistText = '';
  coverArtistArray.forEach((cover, index) => {
    if (cover.artistTwitterHandle) {
      coverArtistText = coverArtistText + ` @${cover.artistTwitterHandle}`;
      if (index != coverArtistArray.length - 1) coverArtistText += ',';
    }
  });

  const coverLine =
    (coverArtistText
      ? `\nI also spy` + coverArtistText + ` covers in there!`
      : `There are ${coverArtistArray.length} covers in there!`) +
    ` I’ll need 1 of each please!!`;

  const tweet = encodeURI(
    twitterIntentPrefix + titleLine + shoutOutLine + coverLine,
  );

  return tweet;
}
