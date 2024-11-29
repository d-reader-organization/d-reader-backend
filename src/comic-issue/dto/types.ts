import {
  ComicIssue,
  ComicIssueCollaborator,
  StatefulCover,
  StatelessCover,
  ComicRarity,
} from '@prisma/client';
import { RoyaltyWalletDto } from './royalty-wallet.dto';

export type ComicIssueCMInput = ComicIssue & {
  statelessCovers: StatelessCover[];
  statefulCovers: StatefulCover[];
  collaborators: ComicIssueCollaborator[];
  royaltyWallets: RoyaltyWalletDto[];
};

export class RarityShare {
  rarity: ComicRarity;
  value: number;
}

export type ComicIssueStatusProperty = keyof Pick<
  ComicIssue,
  'publishedAt' | 'verifiedAt'
>;

export type SearchComicIssue = Pick<ComicIssue, 'id' | 'title' | 'number'> & {
  statelessCovers?: StatelessCover[];
};
