import { CarouselSlide } from '@prisma/client';

export enum CarouselTagTitle {
  Highlighted = 'Highlighted',
  NewComic = 'New series',
  NewCreator = 'New creator',
  Free = 'FREE',
  Sold = 'Sold out',
  Minting = 'Minting live',
  UpcomingMint = 'Minting in',
}

export type CarouselTag = {
  title: string;
  timestamp?: string;
};

export type CarouselWithTags = CarouselSlide & { tags?: CarouselTag[] };
