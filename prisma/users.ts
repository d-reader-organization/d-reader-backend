import { Prisma, Role } from '@prisma/client';
import { faker } from '@faker-js/faker';
import config from '../src/configs/config';
import * as bcrypt from 'bcrypt';

const saltOrRound = config().security.bcryptSaltOrRound;
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, saltOrRound);
};

// Don't worry champs, these passwords are used only for localhost seeding
export const usersToSeed = async (): Promise<
  Prisma.UserCreateManyArgs['data']
> => [
  {
    name: 'superadmin',
    email: 'superadmin@dreader.io',
    password: await hashPassword('superadmin'),
    emailVerifiedAt: new Date(),
    role: Role.Superadmin,
    referralsRemaining: 0,
  },
  {
    name: 'admin',
    email: 'admin@dreader.io',
    password: await hashPassword('admin'),
    emailVerifiedAt: new Date(),
    role: Role.Admin,
    referralsRemaining: 0,
  },
  {
    name: 'athar',
    email: 'athar.mohammad+local@dreader.io',
    password: await hashPassword('athar'),
    emailVerifiedAt: new Date(),
    role: Role.Admin,
    referralsRemaining: 0,
  },
  {
    name: 'josip',
    email: 'josip.volarevic@dreader.io',
    password: await hashPassword('josip'),
    emailVerifiedAt: new Date(),
  },
  {
    name: 'luka',
    email: 'luka.crnogorac@dreader.io',
    password: await hashPassword('luka'),
    emailVerifiedAt: new Date(),
  },
  {
    name: 'testgoogleplay',
    email: 'test@google.play',
    password: await hashPassword('testgoogleplay'),
    emailVerifiedAt: new Date(),
  },
];

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
