import { Prisma } from '@prisma/client';
import config from '../src/configs/config';
import * as bcrypt from 'bcrypt';

const saltOrRound = config().security.bcryptSaltOrRound;
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, saltOrRound);
};

export const studioNx = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  email: 'studionx@fake.com',
  username: 'StudioNX',
  displayName: 'StudioNX',
  password: await hashPassword('studionx'),
  role: 'Creator',
  emailVerifiedAt: new Date(),
  channel: {
    create: {
      handle: 'StudioNX',
      avatar: 'creators/studio-nx/avatar.png',
      banner: 'creators/studio-nx/banner.jpg',
      description:
        'StudioNX is an Emmy award winning visual development house that creates character driven IP for feature film, TV & games.',
      flavorText: 'Look at that, we have an Emmy award!',
      website: 'https://studionx.com',
      twitter: 'https://twitter.com/StudioNX',
      instagram: 'https://www.instagram.com/jim_bryson',
      verifiedAt: new Date(),
      s3BucketSlug: 'studio-nx',
    },
  },
});

export const swamplabs = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  email: 'karlo@fake.com',
  username: 'Swamplabs',
  displayName: 'Swamplabs',
  role: 'Creator',
  password: await hashPassword('swamplabs'),
  emailVerifiedAt: new Date(),
  channel: {
    create: {
      handle: 'Swamplabs',
      avatar: 'creators/swamplabs/avatar.png',
      banner: 'creators/swamplabs/banner.jpg',
      description:
        'Swamplabs is a studio that creates comics and mangas by latest standards, while paying the artists for the cheapest possible amount',
      flavorText: 'Lorem Ipsum dolor sit flavor text',
      website: 'https://swamplabs.com',
      twitter: 'https://twitter.com/lupers_world',
      verifiedAt: new Date(),
      s3BucketSlug: 'swamplabs',
    },
  },
});

export const gonneytoons = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  email: 'admin@fake.com',
  username: 'Gooneytoons',
  displayName: 'Gooneytoons Studio',
  emailVerifiedAt: new Date(),
  password: await hashPassword('gooneytoons'),
  role: 'Creator',
  channel: {
    create: {
      handle: 'Gooneytoons',
      avatar: 'creators/gooneytoons-studio/avatar.png',
      banner: 'creators/gooneytoons-studio/banner.png',
      description:
        'Gooneytoons is a creative studio that breathes life into captivating comics and mesmerizing illustrations, fueling imagination with every stroke of the pen.',
      flavorText: '“Such nasty little creatures” - My dad',
      website: 'https://gooneytoons.studio',
      twitter: 'https://twitter.com/GooneyToonsNFT',
      instagram: 'https://www.instagram.com/gooneytoons.nft',
      verifiedAt: new Date(),
      s3BucketSlug: 'gooneytoons-studio',
    },
  },
});

export const saucerpen = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  email: 'korinahunjak@fake.com',
  username: 'Saucerpen',
  displayName: 'Saucerpen',
  password: await hashPassword('saucerpen'),
  emailVerifiedAt: new Date(),
  role: 'Creator',
  channel: {
    create: {
      handle: 'Saucerpen',
      avatar: 'creators/saucerpen/avatar.jpg',
      banner: 'creators/saucerpen/banner.jpg',
      description:
        'Hello! I am an illustrator, comic artist and graphic designer from Rijeka, Croatia',
      flavorText:
        '“Amazing artist & illustrator” - Croatian Academy of Fine Arts',
      website: 'https://korinahunjak.com/',
      instagram: 'https://www.instagram.com/korina.hunjak/',
      verifiedAt: new Date(),
      s3BucketSlug: 'saucerpen',
    },
  },
});

export const madMuse = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  email: 'james.roche@fake.com',
  username: 'MadMuse',
  displayName: 'Mad Muse Syndicate',
  password: await hashPassword('madmuse'),
  role: 'Creator',
  emailVerifiedAt: new Date(),
  channel: {
    create: {
      handle: 'MadMuse',
      avatar: 'creators/mad-muse-syndicate/avatar.jpg',
      banner: 'creators/mad-muse-syndicate/banner.jpg',
      description:
        'A storytelling studio by Roach Writes, bringing worlds to life while crafting character driven stories in web3',
      flavorText: 'The muse pulls the strings. We are just her puppets.',
      website: 'https://www.jameseroche.com',
      twitter: 'https://twitter.com/RoachWrites_',
      instagram: 'https://www.instagram.com/jameseroche',
      verifiedAt: new Date(),
      s3BucketSlug: 'mad-muse-syndicate',
    },
  },
});

export const tsukiverse = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  email: 'creators@fake.com',
  username: 'Goose0x',
  displayName: 'Goose0x',
  password: await hashPassword('goose'),
  role: 'Creator',
  emailVerifiedAt: new Date(),
  channel: {
    create: {
      handle: 'Goose0x',
      avatar: 'creators/goose-0-x/avatar.jpg',
      banner: 'creators/goose-0-x/banner.jpg',
      description:
        'We are an Art first, story-driven project, with a unique nostalgic feel to make the collection and our brand stand out - all with your support as a loving community',
      flavorText: 'brought to life by: @fake.com',
      website: 'https://www.tsukiverse.io',
      twitter: 'https://twitter.com/tsukiversenft',
      instagram: 'https://www.instagram.com/tsukiv3rse/',
      verifiedAt: new Date(),
      popularizedAt: new Date(),
      s3BucketSlug: 'goose-0-x',
    },
  },
});

export const longwood = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  email: 'john.smith@fake.com',
  username: 'LongwoodLabs',
  displayName: 'LongwoodLabs',
  password: await hashPassword('longwood-labs'),
  role: 'Creator',
  emailVerifiedAt: new Date(),
  channel: {
    create: {
      handle: 'LongwoodLabs',
      avatar: 'creators/longwood-labs/avatar.jpg',
      banner: 'creators/longwood-labs/banner.jpg',
      description: 'Web3 idle gaming studio | Creators of @fake.com',
      flavorText: 'The best gaming studio in web3',
      website: 'https://linktr.ee/theheistgame',
      twitter: 'https://twitter.com/playtheheist',
      verifiedAt: new Date(),
      popularizedAt: new Date(),
      s3BucketSlug: 'longwoodlabs',
    },
  },
});
