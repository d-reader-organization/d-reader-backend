import { Prisma } from '@prisma/client';

export const studioNxCData = (
  userId: number,
): Prisma.CreatorCreateArgs['data'] => ({
  userId,
  email: 'studionx@fake.com',
  name: 'StudioNX',
  slug: 'studio-nx',
  avatar: 'creators/studio-nx/avatar.png',
  banner: 'creators/studio-nx/banner.jpg',
  logo: 'creators/studio-nx/logo.png',
  description:
    'StudioNX is an Emmy award winning visual development house that creates character driven IP for feature film, TV & games.',
  flavorText: 'Look at that, we have an Emmy award!',
  website: 'https://studionx.com',
  twitter: 'https://twitter.com/StudioNX',
  instagram: 'https://www.instagram.com/jim_bryson',
  verifiedAt: new Date(),
  emailVerifiedAt: new Date(),
});

export const swamplabsCData = (
  userId: number,
): Prisma.CreatorCreateArgs['data'] => ({
  userId,
  email: 'karlo@swamplabs.com',
  name: 'Swamplabs',
  slug: 'swamplabs',
  avatar: 'creators/swamplabs/avatar.png',
  banner: 'creators/swamplabs/banner.jpg',
  logo: 'creators/swamplabs/logo.jpg',
  description:
    'Swamplabs is a studio that creates comics and mangas by latest standards, while paying the artists for the cheapest possible amount',
  flavorText: 'Lorem Ipsum dolor sit flavor text',
  website: 'https://swamplabs.com',
  twitter: 'https://twitter.com/lupers_world',
  verifiedAt: new Date(),
  emailVerifiedAt: new Date(),
});

export const gonneytoonsCData = (
  userId: number,
): Prisma.CreatorCreateArgs['data'] => ({
  userId,
  email: 'admin@gooneytoons.studio',
  name: 'Gooneytoons Studio',
  slug: 'gooneytoons-studio',
  avatar: 'creators/gooneytoons-studio/avatar.png',
  banner: 'creators/gooneytoons-studio/banner.png',
  logo: 'creators/gooneytoons-studio/logo.png',
  description:
    'Gooneytoons is a creative studio that breathes life into captivating comics and mesmerizing illustrations, fueling imagination with every stroke of the pen.',
  flavorText: '“Such nasty little creatures” - My dad',
  website: 'https://gooneytoons.studio',
  twitter: 'https://twitter.com/GooneyToonsNFT',
  instagram: 'https://www.instagram.com/gooneytoons.nft',
  verifiedAt: new Date(),
  emailVerifiedAt: new Date(),
});

export const saucerpenCData = (
  userId: number,
): Prisma.CreatorCreateArgs['data'] => ({
  userId,
  email: 'korinahunjak@gmail.com',
  name: 'Saucerpen',
  slug: 'saucerpen',
  avatar: 'creators/saucerpen/avatar.jpg',
  banner: 'creators/saucerpen/banner.jpg',
  logo: 'creators/saucerpen/logo.png',
  description:
    'Hello! I am an illustrator, comic artist and graphic designer from Rijeka, Croatia',
  flavorText: '“Amazing artist & illustrator” - Croatian Academy of Fine Arts',
  website: 'https://korinahunjak.com/',
  instagram: 'https://www.instagram.com/korina.hunjak/',
  verifiedAt: new Date(),
  emailVerifiedAt: new Date(),
});

export const madMuseCData = (
  userId: number,
): Prisma.CreatorCreateArgs['data'] => ({
  userId,
  email: 'james.roche@dreader.io',
  name: 'Mad Muse Syndicate',
  slug: 'mad-muse-syndicate',
  avatar: 'creators/mad-muse-syndicate/avatar.jpg',
  banner: 'creators/mad-muse-syndicate/banner.jpg',
  logo: 'creators/mad-muse-syndicate/logo.jpg',
  description:
    'A storytelling studio by Roach Writes, bringing worlds to life while crafting character driven stories in web3',
  flavorText: 'The muse pulls the strings. We are just her puppets.',
  website: 'https://www.jameseroche.com',
  twitter: 'https://twitter.com/RoachWrites_',
  instagram: 'https://www.instagram.com/jameseroche',
  verifiedAt: new Date(),
  emailVerifiedAt: new Date(),
});

export const tsukiverseCData = (
  userId: number,
): Prisma.CreatorCreateArgs['data'] => ({
  userId,
  email: 'creators@dreader.io',
  name: 'Goose0x',
  slug: 'goose-0-x',
  avatar: 'creators/goose-0-x/avatar.jpg',
  banner: 'creators/goose-0-x/banner.jpg',
  logo: 'creators/goose-0-x/logo.png',
  description:
    'We are an Art first, story-driven project, with a unique nostalgic feel to make the collection and our brand stand out - all with your support as a loving community',
  flavorText: 'brought to life by: @dangercloselabs | Artist and Lore @goose0x',
  website: 'https://www.tsukiverse.io',
  twitter: 'https://twitter.com/tsukiversenft',
  instagram: 'https://www.instagram.com/tsukiv3rse/',
  verifiedAt: new Date(),
  popularizedAt: new Date(),
  emailVerifiedAt: new Date(),
});

export const longwoodCData = (
  userId: number,
): Prisma.CreatorCreateArgs['data'] => ({
  userId,
  email: 'john.smith@longwood-labs.com',
  name: 'Longwood Labs',
  slug: 'longwood-labs',
  avatar: 'creators/longwood-labs/avatar.jpg',
  banner: 'creators/longwood-labs/banner.jpg',
  logo: 'creators/longwood-labs/logo.png',
  description:
    'Web3 idle gaming studio | Creators of @RemnantsNFT & @playtheheist',
  flavorText: 'The best gaming studio in web3',
  website: 'https://linktr.ee/theheistgame',
  twitter: 'https://twitter.com/playtheheist',
  verifiedAt: new Date(),
  popularizedAt: new Date(),
  emailVerifiedAt: new Date(),
});
