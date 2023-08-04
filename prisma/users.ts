import { Prisma, Role } from '@prisma/client';
import { faker } from '@faker-js/faker';

// Don't worry champs, these passwords are used only for localhost seeding
export const usersToSeed: Prisma.UserCreateManyArgs['data'] = [
  {
    name: 'superadmin',
    email: 'superadmin@dreader.io',
    password: 'superadmin',
    emailVerifiedAt: new Date(),
    role: Role.Superadmin,
    referralsRemaining: 0,
  },
  {
    name: 'admin',
    email: 'admin@dreader.io',
    password: 'admin',
    emailVerifiedAt: new Date(),
    role: Role.Admin,
    referralsRemaining: 0,
  },
  {
    name: 'josip',
    email: 'josip.volarevic@dreader.io',
    password: 'josip',
    emailVerifiedAt: new Date(),
  },
  {
    name: 'luka',
    email: 'luka.crnogorac@dreader.io',
    password: 'luka',
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
