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

export class StatefulCoverInput {
  image: string;
  artist: string;
  rarity: ComicRarity;
  isSigned: boolean;
  isUsed: boolean;
}

export type CandyMachineIssue = ComicIssue & {
  statelessCovers: StatelessCover[];
  statefulCovers: StatefulCover[];
  collaborators: ComicIssueCollaborator[];
};

export class RarityConstant {
  rarity: ComicRarity;
  value: number;
}
