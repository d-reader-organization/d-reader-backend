import {
  ComicIssue,
  ComicIssueCollaborator,
  ComicRarity,
  StatefulCover,
  StatelessCover,
} from '@prisma/client';

export type ComicIssueCMInput = ComicIssue & {
  statelessCovers: StatelessCover[];
  statefulCovers: StatefulCover[];
  collaborators: ComicIssueCollaborator[];
};

export class RarityShare {
  rarity: ComicRarity;
  value: number;
}
