import {
  ComicIssue,
  ComicIssueCollaborator,
  RoyaltyWallet,
  StatefulCover,
  StatelessCover,
  ComicRarity,
} from '@prisma/client';

export type ComicIssueCMInput = ComicIssue & {
  statelessCovers: StatelessCover[];
  statefulCovers: StatefulCover[];
  collaborators: ComicIssueCollaborator[];
  royaltyWallets: RoyaltyWallet[];
};

export class RarityShare {
  rarity: ComicRarity;
  value: number;
}
