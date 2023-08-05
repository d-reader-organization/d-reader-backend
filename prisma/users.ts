import { Prisma, Role } from '@prisma/client';
import { faker } from '@faker-js/faker';
import config from '../src/configs/config';
import * as bcrypt from 'bcrypt';

const saltOrRound = config().security.bcryptSaltOrRound;
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, saltOrRound);
};

export const superadminData = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  name: 'superadmin',
  email: 'superadmin@dreader.io',
  password: await hashPassword('superadmin'),
  emailVerifiedAt: new Date(),
  role: Role.Superadmin,
  referralsRemaining: 0,
});

export const adminData = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  name: 'admin',
  email: 'admin@dreader.io',
  password: await hashPassword('admin'),
  emailVerifiedAt: new Date(),
  role: Role.Admin,
  referralsRemaining: 0,
});

export const josipData = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  name: 'josip',
  email: 'josip.volarevic@dreader.io',
  password: await hashPassword('josip'),
  emailVerifiedAt: new Date(),
});

export const lukaData = async (): Promise<Prisma.UserCreateArgs['data']> => ({
  name: 'luka',
  email: 'luka.crnogorac@dreader.io',
  password: await hashPassword('luka'),
  emailVerifiedAt: new Date(),
});

export const studionxData = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  name: 'StudioNX',
  email: 'studionx@fake.com',
  password: await hashPassword('studionx'),
  emailVerifiedAt: new Date(),
});

export const swamplabsData = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  name: 'Swamplabs',
  email: 'swamplabs@fake.com',
  password: await hashPassword('swamplabs'),
  emailVerifiedAt: new Date(),
});

export const gooneytoonsData = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  name: 'Gooneytoons',
  email: 'gooneytoons@fake.com',
  password: await hashPassword('gooneytoons'),
  emailVerifiedAt: new Date(),
});

export const saucerpenData = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  name: 'Saucerpen',
  email: 'saucerpen@fake.com',
  password: await hashPassword('saucerpen'),
  emailVerifiedAt: new Date(),
});

export const madmuseData = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  name: 'Mad Muse Syndicate',
  email: 'madmusesyndicate@fake.com',
  password: await hashPassword('madmusesyndicate'),
  emailVerifiedAt: new Date(),
});

export const tsukiverseData = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  name: 'Tsukiverse',
  email: 'tsukiverse@fake.com',
  password: await hashPassword('tsukiverse'),
  emailVerifiedAt: new Date(),
});

export const longwoodlabsData = async (): Promise<
  Prisma.UserCreateArgs['data']
> => ({
  name: 'Longwood Labs',
  email: 'longwoodlabs@fake.com',
  password: await hashPassword('longwoodlabs'),
  emailVerifiedAt: new Date(),
});

const generateDummyUserData = (): Prisma.UserCreateArgs['data'] => {
  return {
    name: faker.internet.userName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    emailVerifiedAt: faker.date.past(),
  };
};

export const generateDummyUsersData = (
  count: number,
): Prisma.UserCreateArgs['data'][] => {
  return faker.helpers.multiple(generateDummyUserData, { count });
};
