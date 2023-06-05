import {
  ComicIssue,
  ComicIssueCollaborator,
  ComicRarity,
  StateFulCover,
  StateLessCover,
} from '@prisma/client';

export class StateLessCoverInput {
  image: string;
  artist: string;
  rarity: ComicRarity;
}

export type CandyMachineIssue = ComicIssue & {
  stateLessCovers: StateLessCover[]; // typos TODODO
  stateFulCovers: StateFulCover[];
  collaborators: ComicIssueCollaborator[];
};

export class RarityConstant {
  rarity: ComicRarity;
  value: number;
}
