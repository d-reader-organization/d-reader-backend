import {
  ComicIssue,
  ComicIssueCollaborator,
  RoyaltyWallet,
  StatefulCover,
  StatelessCover,
} from '@prisma/client';
import { ComicRarity } from 'dreader-comic-verse';

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
