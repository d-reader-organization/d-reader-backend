import {
  ComicIssue,
  ComicIssueCollaborator,
  StatefulCover,
  StatelessCover,
} from '@prisma/client';
import { ComicRarity } from 'dreader-comic-verse';

export type ComicIssueCMInput = ComicIssue & {
  statelessCovers: StatelessCover[];
  statefulCovers: StatefulCover[];
  collaborators: ComicIssueCollaborator[];
};

export class RarityShare {
  rarity: ComicRarity;
  value: number;
}
