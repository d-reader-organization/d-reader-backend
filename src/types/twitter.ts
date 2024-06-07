import { UtmSource } from '../twitter/dto/intent-comic-minted-params.dto';

export type ComicMintedTweetArgs = {
  comicTitle: string;
  comicSlug: string;
  comicIssueTitle: string;
  comicIssueSlug: string;
  comicAssetRarity: string;
  source: UtmSource;
  creatorName: string;
  coverArtistName: string;
};

export type IssueSpotlightTweetArgs = {
  creatorTwitter: string;
  comicIssueTitle: string;
  comicTitle: string;
  creatorName: string;
  coverArtistArray: { artistTwitterHandle: string }[];
};
