import {
  ComicIssue,
  ComicIssueCollaborator,
  ComicRarity,
  StatefulCover,
  StatelessCover,
} from '@prisma/client';

export class StatelessCoverInput {
  image: string;
  artist: string;
  rarity: ComicRarity;
  share: number;
  isDefault: boolean;
}

// TODO: move these to relevant DTOs ??

export class StatefulCoverInput {
  image: string;
  artist: string;
  rarity: ComicRarity;
  isSigned: boolean;
  isUsed: boolean;
}

export type ComicIssueCMInput = ComicIssue & {
  statelessCovers: StatelessCover[];
  statefulCovers: StatefulCover[];
  collaborators: ComicIssueCollaborator[];
};

export class RarityShare {
  rarity: ComicRarity;
  value: number;
}
