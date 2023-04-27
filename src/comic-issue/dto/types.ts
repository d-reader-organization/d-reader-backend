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

export type ComicIssueInput = ComicIssue & {
  stateLessCovers: StateLessCover[];
  stateFulCovers: StateFulCover[];
  collaborators: ComicIssueCollaborator[];
};

export class RarityConstant {
  rarity: ComicRarity;
  value: number;
}
