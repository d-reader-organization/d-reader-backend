import { removeTwitter } from './helpers';
import {
  ComicMintedTweetArgs,
  IssueSpotlightTweetArgs,
} from '../types/twitter';
import { isEmpty, kebabCase } from 'lodash';
import { Comic, ComicIssue, Creator } from '@prisma/client';
import { D_READER_LINKS } from './client-links';
import { toOrdinal } from './lodash';
import { D_READER_FRONTEND_URL } from '../constants';

export const TWITTER_INTENT_PREFIX = encodeURI(
  'https://x.com/intent/tweet?text=',
);

export const TWITTER_INTENT = {
  // Get Tweet content for sharing the minted comic
  comicMinted: (args: ComicMintedTweetArgs) => {
    const titleLine = `I just minted a ${args.comicAssetRarity} '${args.comicTitle}: ${args.comicIssueTitle}' comic on @dReaderApp! 🔥\n\n`;

    const isGeckos = args.creatorName.toLowerCase() === '@galacticgeckosg';
    let addOnLine = '';
    let creatorLine = `✍️ story by ${args.creatorName}\n`;

    if (isGeckos) {
      addOnLine = `🦎 ${args.creatorName} story\n`;
      creatorLine = `✍️ written by @RoachWrites_\n`;
    }
    const coverArtistLine = `🖌️ cover by ${args.coverArtistName}\n\n`;
    const mintLinkCTALine = 'Mint yours here! 👇\n';

    const tweetBody = encodeURIComponent(
      titleLine + addOnLine + creatorLine + coverArtistLine + mintLinkCTALine,
    );

    const mintLinkPrefix = encodeURI(`${D_READER_FRONTEND_URL}/mint/`);
    const mintLinkComicSlug = encodeURIComponent(
      `${args.comicSlug}_${args.comicIssueSlug}`,
    );
    const mintLinkSource = encodeURI('?ref=') + encodeURIComponent(args.source);
    const coverRarity = encodeURIComponent('&rarity=' + args.comicAssetRarity);

    const tweetMintLink =
      mintLinkPrefix + mintLinkComicSlug + mintLinkSource + coverRarity;
    const tweetText = TWITTER_INTENT_PREFIX + tweetBody + tweetMintLink;

    return tweetText;
  },
  // Get Tweet content for sharing a newly verified creator
  creatorVerified: (creator: Creator) => {
    const titleLine = `My creator account is now verified on @dReaderApp! 🔥\n\n`;
    const subtitleLine = 'Thrilled to join the dReader family! 🫂\n\n';

    const linkCTA = "I'll be publishing my stuff here! 👇\n";

    const tweetBody = encodeURIComponent(titleLine + subtitleLine + linkCTA);
    const creatorLink = encodeURI(D_READER_LINKS.creator(creator.slug));

    const tweetText = TWITTER_INTENT_PREFIX + tweetBody + creatorLink;

    return tweetText;
  },
  // Get Tweet content for sharing a newly published comic
  comicPublished: (comic: Comic) => {
    const titleLine = `My comic ${comic.title} is now published on @dReaderApp! 🔥\n\n`;
    const subtitleLine = 'Check it out here! 👇\n';

    const tweetBody = encodeURIComponent(titleLine + subtitleLine);
    const comicLink = encodeURI(D_READER_LINKS.comic(comic.slug));

    const tweetText = TWITTER_INTENT_PREFIX + tweetBody + comicLink;

    return tweetText;
  },
  // Get Tweet content for sharing a newly published comic issue
  comicIssuePublished: (comicIssue: ComicIssue & { comic: Comic }) => {
    const titleLine = `${toOrdinal(comicIssue.number)} episode of my ${
      comicIssue.comic.title
    } series is now LIVE on @dReaderApp! 🔥\n\n`;
    const subtitleLine = `Read it here! 👇\n`;

    const tweetBody = encodeURIComponent(titleLine + subtitleLine);
    const comicLink = encodeURI(D_READER_LINKS.comicIssue(comicIssue.id));

    const tweetText = TWITTER_INTENT_PREFIX + tweetBody + comicLink;

    return tweetText;
  },
  // Get Tweet content for sharing a featured comic issue
  spotlightComicIssue: (args: IssueSpotlightTweetArgs) => {
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
    const comicLinkLine = `${D_READER_FRONTEND_URL}/comic/${kebabCase(
      comicTitle,
    )}`;
    const endOfTweet = `You can read the first ${previewPageCount} pages in-app now!\n\nShow it some love if you can and give both @${creatorTag} and ${comicTitle} series a LIKE, some STARS, and a FOLLOW on there!`;

    const tweetText = encodeURI(
      `${twitterIntentPrefix}${titleLine}\n\n${shoutOutLine}\n${flavorText}\n\n${personalizedText}\n\n${endOfTweet}\n\n${comicLinkCallToActionLine}\n${comicLinkLine}`,
    );

    return tweetText;
  },
};
