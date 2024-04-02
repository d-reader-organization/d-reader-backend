import { Prisma } from '@prisma/client';
import config from '../src/configs/config';
import * as bcrypt from 'bcrypt';

const saltOrRound = config().security.bcryptSaltOrRound;
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, saltOrRound);
};

export const studioNx = async (): Promise<
  Prisma.CreatorCreateArgs['data']
> => ({
  email: 'studionx@fake.com',
  name: 'StudioNX',
  slug: 'studio-nx',
  password: await hashPassword('studionx'),
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
  s3BucketSlug: 'studio-nx',
});

export const swamplabs = async (): Promise<
  Prisma.CreatorCreateArgs['data']
> => ({
  email: 'karlo@fake.com',
  name: 'Swamplabs',
  slug: 'swamplabs',
  password: await hashPassword('swamplabs'),
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
  s3BucketSlug: 'swamplabs',
});

export const gonneytoons = async (): Promise<
  Prisma.CreatorCreateArgs['data']
> => ({
  email: 'admin@fake.com',
  name: 'Gooneytoons Studio',
  slug: 'gooneytoons-studio',
  password: await hashPassword('gooneytoons'),
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
  s3BucketSlug: 'gooneytoons-studio',
});

export const saucerpen = async (): Promise<
  Prisma.CreatorCreateArgs['data']
> => ({
  email: 'korinahunjak@fake.com',
  name: 'Saucerpen',
  slug: 'saucerpen',
  password: await hashPassword('saucerpen'),
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
  s3BucketSlug: 'saucerpen',
});

export const madMuse = async (): Promise<Prisma.CreatorCreateArgs['data']> => ({
  email: 'james.roche@fake.com',
  name: 'Mad Muse Syndicate',
  slug: 'mad-muse-syndicate',
  password: await hashPassword('madmuse'),
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
  s3BucketSlug: 'mad-muse-syndicate',
});

export const tsukiverse = async (): Promise<
  Prisma.CreatorCreateArgs['data']
> => ({
  email: 'creators@fake.com',
  name: 'Goose0x',
  slug: 'goose-0-x',
  password: await hashPassword('goose'),
  avatar: 'creators/goose-0-x/avatar.jpg',
  banner: 'creators/goose-0-x/banner.jpg',
  logo: 'creators/goose-0-x/logo.png',
  description:
    'We are an Art first, story-driven project, with a unique nostalgic feel to make the collection and our brand stand out - all with your support as a loving community',
  flavorText: 'brought to life by: @fake.com',
  website: 'https://www.tsukiverse.io',
  twitter: 'https://twitter.com/tsukiversenft',
  instagram: 'https://www.instagram.com/tsukiv3rse/',
  verifiedAt: new Date(),
  popularizedAt: new Date(),
  emailVerifiedAt: new Date(),
  s3BucketSlug: 'goose-0-x',
});

export const longwood = async (): Promise<
  Prisma.CreatorCreateArgs['data']
> => ({
  email: 'john.smith@fake.com',
  name: 'Longwood Labs',
  slug: 'longwoodlabs',
  password: await hashPassword('longwood-labs'),
  avatar: 'creators/longwood-labs/avatar.jpg',
  banner: 'creators/longwood-labs/banner.jpg',
  logo: 'creators/longwood-labs/logo.png',
  description: 'Web3 idle gaming studio | Creators of @fake.com',
  flavorText: 'The best gaming studio in web3',
  website: 'https://linktr.ee/theheistgame',
  twitter: 'https://twitter.com/playtheheist',
  verifiedAt: new Date(),
  popularizedAt: new Date(),
  emailVerifiedAt: new Date(),
  s3BucketSlug: 'longwoodlabs',
});
