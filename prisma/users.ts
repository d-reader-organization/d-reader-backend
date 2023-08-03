import { Prisma, Role } from '@prisma/client';
import { faker } from '@faker-js/faker';

export const superadminData: Prisma.UserCreateArgs['data'] = {
  name: 'superadmin',
  email: 'superadmin@dreader.io',
  password: 'superadmin',
  emailVerifiedAt: new Date(),
  role: Role.Superadmin,
  referralsRemaining: 0,
};

export const adminData: Prisma.UserCreateArgs['data'] = {
  name: 'admin',
  email: 'admin@dreader.io',
  password: 'admin',
  emailVerifiedAt: new Date(),
  role: Role.Admin,
  referralsRemaining: 0,
};

export const josipData: Prisma.UserCreateArgs['data'] = {
  name: 'josip',
  email: 'josip.volarevic@dreader.io',
  password: 'josip',
  emailVerifiedAt: new Date(),
};

export const lukaData: Prisma.UserCreateArgs['data'] = {
  name: 'luka',
  email: 'luka.crnogorac@dreader.io',
  password: 'luka',
  emailVerifiedAt: new Date(),
};

export const studionxData: Prisma.UserCreateArgs['data'] = {
  name: 'StudioNX',
  email: 'studionx@fake.com',
  password: 'studionx',
  emailVerifiedAt: new Date(),
};

export const swamplabsData: Prisma.UserCreateArgs['data'] = {
  name: 'Swamplabs',
  email: 'swamplabs@fake.com',
  password: 'swamplabs',
  emailVerifiedAt: new Date(),
};

export const gooneytoonsData: Prisma.UserCreateArgs['data'] = {
  name: 'Gooneytoons',
  email: 'gooneytoons@fake.com',
  password: 'gooneytoons',
  emailVerifiedAt: new Date(),
};

export const saucerpenData: Prisma.UserCreateArgs['data'] = {
  name: 'Saucerpen',
  email: 'saucerpen@fake.com',
  password: 'saucerpen',
  emailVerifiedAt: new Date(),
};

export const madmuseData: Prisma.UserCreateArgs['data'] = {
  name: 'Mad Muse Syndicate',
  email: 'madmusesyndicate@fake.com',
  password: 'madmusesyndicate',
  emailVerifiedAt: new Date(),
};

export const tsukiverseData: Prisma.UserCreateArgs['data'] = {
  name: 'Tsukiverse',
  email: 'tsukiverse@fake.com',
  password: 'tsukiverse',
  emailVerifiedAt: new Date(),
};

export const longwoodlabsData: Prisma.UserCreateArgs['data'] = {
  name: 'Longwood Labs',
  email: 'longwoodlabs@fake.com',
  password: 'longwoodlabs',
  emailVerifiedAt: new Date(),
};

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
