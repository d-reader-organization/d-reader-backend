import { CarouselSlide } from '@prisma/client';

export enum CarouselTagTitle {
  Highlighted = 'Highlighted',
  NewComic = 'New series',
  NewCreator = 'New creator',
  Free = 'FREE',
  Sold = 'Sold out',
  Minting = 'Minting live',
  UpcomingMint = 'Minting in',
  Launchpad = 'To launchpad',
  Tensor = 'Trade on Tensor',
  Checkout = 'Check out',
}

export enum CarouselTagType {
  Subject = 'Subject',
  Button = 'Button',
}

export type CarouselTag = {
  title: string;
  type: CarouselTagType;
  href?: string;
  timestamp?: string;
};

export type CarouselWithTags = CarouselSlide & { tags?: CarouselTag[] };
