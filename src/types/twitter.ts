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
  comicTitle: string;
  flavorText: string;
  creatorName: string;
  previewPageCount: number;
};
