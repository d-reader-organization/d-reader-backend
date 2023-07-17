import {
  ComicIssue,
  ComicIssueCollaborator,
  ComicPdfTranslation,
  StatefulCover,
  StatelessCover,
} from '@prisma/client';
import { ComicRarity } from 'dreader-comic-verse';

export type ComicIssueCMInput = ComicIssue & {
  statelessCovers: StatelessCover[];
  statefulCovers: StatefulCover[];
  collaborators: ComicIssueCollaborator[];
  pdfTranslations: ComicPdfTranslation[];
};

export class RarityShare {
  rarity: ComicRarity;
  value: number;
}
