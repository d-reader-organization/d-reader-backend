import { PrismaClient, Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  await prisma.comicIssueNft.deleteMany();
  await prisma.comicPage.deleteMany();
  await prisma.comicIssue.deleteMany();
  await prisma.walletComic.deleteMany();
  await prisma.comic.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.genre.deleteMany();

  console.log('Emptied database...');

  try {
    await prisma.genre.createMany({
      data: [
        {
          name: 'Action',
          slug: 'action',
          deletedAt: null,
          image: 'genres/action/image.png',
        },
        {
          name: 'Sci-Fi',
          slug: 'sci-fi',
          deletedAt: null,
          image: 'genres/sci-fi/image.png',
        },
        {
          name: 'Comedy',
          slug: 'comedy',
          deletedAt: null,
          image: 'genres/comedy/image.png',
        },
        {
          name: 'Slice of Life',
          slug: 'slice-of-life',
          deletedAt: null,
          image: 'genres/slice-of-life/image.png',
        },
        {
          name: 'Romance',
          slug: 'romance',
          deletedAt: null,
          image: 'genres/romance/image.png',
        },
        {
          name: 'History',
          slug: 'history',
          deletedAt: null,
          image: 'genres/history/image.png',
        },
      ],
    });
    console.log(
      "Added comic genres: 'action', 'sci-fi', 'comedy', 'slice-of-life', 'romance', 'history'",
    );
  } catch (e) {
    console.log('Failed to add comic genres', e);
  }

  try {
    await prisma.wallet.upsert({
      where: { address: '7aLBCrbn4jDNSxLLJYRRnKbkqA5cuaeaAzn74xS7eKPD' },
      update: {},
      create: {
        address: '7aLBCrbn4jDNSxLLJYRRnKbkqA5cuaeaAzn74xS7eKPD',
        label: 'Superadmin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Superadmin,
      },
    });
    console.log('Added Superadmin wallet');
  } catch (e) {
    console.log('Failed to add Superadmin wallet', e);
  }

  try {
    await prisma.wallet.upsert({
      where: { address: '75eLTqY6pfTGhuzXAtRaWYXW9DDPhmX5zStvCjDKDmZ9' },
      update: {},
      create: {
        address: '75eLTqY6pfTGhuzXAtRaWYXW9DDPhmX5zStvCjDKDmZ9',
        label: 'Admin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Admin,
      },
    });
    console.log('Added Admin wallet');
  } catch (e) {
    console.log('Failed to add Admin wallet', e);
  }

  try {
    await prisma.wallet.upsert({
      where: { address: 'DXvYRNGBZmvEcefKSsNh7EcjEw1YgoiHaUtt2HLaX6yL' },
      update: {},
      create: {
        address: 'DXvYRNGBZmvEcefKSsNh7EcjEw1YgoiHaUtt2HLaX6yL',
        label: 'StudioNX',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          connectOrCreate: {
            where: { email: 'adam@studionx.com' },
            create: {
              email: 'adam@studionx.com',
              name: 'StudioNX',
              slug: 'studio-nx',
              thumbnail: '',
              avatar: '',
              banner: '',
              logo: '',
              description:
                'StudioNX is an Emmy award winning visual development house that creates character driven IP for feature film, TV & games.',
              flavorText: 'Look at that, we have an Emmy award!',
              website: 'https://studionx.com',
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              popularizedAt: null,
              emailConfirmedAt: new Date(),
              comics: {
                create: {
                  name: 'Gorecats',
                  slug: 'gorecats',
                  description:
                    'Gorecats are an eclectic breed of treacherous little trouble makers, hell bent on using every single one of their glorious nine lives.',
                  flavorText:
                    'by Emmy award winning duo Jim Bryson & Adam Jeffcoat',
                  genres: { connect: [{ slug: 'action' }, { slug: 'sci-fi' }] },
                  isOngoing: true,
                  deletedAt: null,
                  featuredAt: null,
                  verifiedAt: new Date(),
                  publishedAt: new Date(),
                  popularizedAt: null,
                  thumbnail: '',
                  pfp: '',
                  logo: '',
                  website: 'https://gorecats.io',
                  twitter: 'https://twitter.com/GORECATS',
                  discord: 'https://discord.com/invite/gorecats',
                  telegram: 'https://t.me/Gorecats',
                  instagram: 'https://www.instagram.com/gorecats_art',
                  medium: '',
                  tikTok: '',
                  youTube: '',
                  magicEden:
                    'https://magiceden.io/creators/gorecats_collection',
                  openSea: '',
                  issues: {
                    create: {
                      number: 1,
                      title: 'Rise of the Gorecats',
                      slug: 'rise-of-the-gorecats',
                      description:
                        'A sadistic breed of bloodthirsty critters wreak havoc across the city of catsburg. A washed up detective and his gung ho rookie are the only ones standing in the way of a full on invasion.',
                      flavorText: 'Jesus these cats are so gore',
                      cover: '',
                      soundtrack: '',
                      magicEden: 'https://magiceden.io/marketplace/gorecats',
                      openSea: '',
                      releaseDate: '2022-08-08T08:00:00.000Z',
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      nfts: {
                        createMany: {
                          data: [
                            {
                              mint: 'FUwt1egmDAbNM6BGBM1Ao3FPxHuLsHunURjwA43jeQUr',
                            },
                            {
                              mint: 'EaaY6ooYGbtZZFQJ4wvt3oSD2NG64ELPAzzt4HrX8DxQ',
                            },
                            {
                              mint: 'D3YjWNBybTFV33LKfx67FcWS7RqqLsDY9b3m7w8nSRAh',
                            },
                            {
                              mint: 'HnKX2EBzuZLX1Qv7uv6aHj5jPDwQcBknRHtKhpZdsrEV',
                            },
                            {
                              mint: 'GZF5kLAvzN2JkN3xE7Y6QQAnTP9PgapEvUcj3tALpH5h',
                            },
                            {
                              mint: 'Q84BdVBNasC19d4zZbzsu5dZNhqtYLbhnXdALPZuguC',
                            },
                            {
                              mint: 'ITxAAxdiEwJzdwXiUY4xPP8LqytXz21C42i4gZ5qfoF2',
                            },
                            {
                              mint: 'HpKpp7bk4e7Lp9mTJbQ7SR5brBTE1x1qD9dnEfiphMfa',
                            },
                          ],
                        },
                      },
                      pages: {
                        createMany: {
                          data: [
                            {
                              pageNumber: 1,
                              isPreviewable: true,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-1.png',
                            },
                            {
                              pageNumber: 2,
                              isPreviewable: true,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-2.png',
                            },
                            {
                              pageNumber: 3,
                              isPreviewable: true,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-3.png',
                            },
                            {
                              pageNumber: 4,
                              isPreviewable: true,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-4.png',
                            },
                            {
                              pageNumber: 5,
                              isPreviewable: true,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-5.png',
                            },
                            {
                              pageNumber: 6,
                              isPreviewable: true,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-6.png',
                            },
                            {
                              pageNumber: 7,
                              isPreviewable: true,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-7.png',
                            },
                            {
                              pageNumber: 8,
                              isPreviewable: true,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-8.png',
                            },
                            {
                              pageNumber: 9,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-9.png',
                            },
                            {
                              pageNumber: 10,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-10.png',
                            },
                            {
                              pageNumber: 11,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-11.png',
                            },
                            {
                              pageNumber: 12,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-12.png',
                            },
                            {
                              pageNumber: 13,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-13.png',
                            },
                            {
                              pageNumber: 14,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-14.png',
                            },
                            {
                              pageNumber: 15,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-15.png',
                            },
                            {
                              pageNumber: 16,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-16.png',
                            },
                            {
                              pageNumber: 17,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-17.png',
                            },
                            {
                              pageNumber: 18,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-18.png',
                            },
                            {
                              pageNumber: 19,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-19.png',
                            },
                            {
                              pageNumber: 20,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-20.png',
                            },
                            {
                              pageNumber: 21,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-21.png',
                            },
                            {
                              pageNumber: 22,
                              isPreviewable: false,
                              image:
                                'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages/page-22.png',
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    console.log('Added "StudioNX" creator');
  } catch (e) {
    console.log('Failed to add "StudioNX" creator', e);
  }

  try {
    await prisma.wallet.upsert({
      where: { address: 'AQf9RzGk8WD92AoqCc98CVyEw56AMMKAoiFFasLk1PYQ' },
      update: {},
      create: {
        address: 'AQf9RzGk8WD92AoqCc98CVyEw56AMMKAoiFFasLk1PYQ',
        label: 'Swamplabs',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          connectOrCreate: {
            where: { email: 'karlo@swamplabs.com' },
            create: {
              email: 'karlo@swamplabs.com',
              name: 'Swamplabs',
              slug: 'swamplabs',
              thumbnail: '',
              avatar: '',
              banner: '',
              logo: '',
              description:
                'Swamplabs is a studio that creates comics and mangas by latest standards, while paying the artists for the cheapest possible amount',
              flavorText: 'Lorem Ipsum dolor sit flavor text',
              website: 'https://swamplabs.com',
              createdAt: new Date(),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              popularizedAt: null,
              emailConfirmedAt: new Date(),
              comics: {
                create: {
                  name: 'The Narentines',
                  slug: 'the-narentines',
                  description:
                    "Hidden from human eyes lived a great nation in the vast valley of Neretva. It's origin and numbers unknown, it's practices a complete mystery.\\nA young boy discovers what seems to be a completely new species.",
                  flavorText:
                    'Unique and intriguing Sci-Fi with a sprinkle of history on top of it. Brilliant! - The Journal',
                  genres: {
                    connect: [
                      { slug: 'action' },
                      { slug: 'sci-fi' },
                      { slug: 'romance' },
                    ],
                  },
                  isOngoing: true,
                  deletedAt: null,
                  featuredAt: null,
                  verifiedAt: new Date(),
                  publishedAt: new Date(),
                  popularizedAt: null,
                  thumbnail: '',
                  pfp: '',
                  logo: '',
                  website: 'https://narentines.com',
                  twitter: 'https://twitter.com/Narentines',
                  discord: 'https://discord.com/invite/narentines',
                  telegram: '',
                  instagram: '',
                  medium: 'https://medium.com/@NarentinesNFT',
                  tikTok: '',
                  youTube: '',
                  magicEden:
                    'https://www.magiceden.io/marketplace/narentinesnft',
                  openSea: '',
                  issues: {
                    create: {
                      number: 1,
                      title: 'Narentines: The Purge',
                      slug: 'narentines-the-purge',
                      description:
                        "Only but a few left remaining, as a new dawn rose and the Prophet noticed the signs.\\nA new age would start for Narentines, as the great Purge pawes it's path to the Valley",
                      flavorText:
                        'The great stone is destroyed and sacrifise must be made to please the Mighty Abaia',
                      cover: '',
                      soundtrack: '',
                      magicEden:
                        'https://www.magiceden.io/marketplace/narentinesnft',
                      openSea: '',
                      releaseDate: '2022-08-08T08:00:00.000Z',
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      nfts: {
                        createMany: {
                          data: [
                            {
                              mint: 'DaaY6ooYGbtZZFQJ4wvt3oSD2NG64ELPAzzt4HrX8DxQ',
                            },
                            {
                              mint: 'C3YjWNBybTFV33LKfx67FcWS7RqqLsDY9b3m7w8nSRAh',
                            },
                            {
                              mint: 'GnKX2EBzuZLX1Qv7uv6aHj5jPDwQcBknRHtKhpZdsrEV',
                            },
                            {
                              mint: 'FZF5kLAvzN2JkN3xE7Y6QQAnTP9PgapEvUcj3tALpH5h',
                            },
                            {
                              mint: 'Z84BdVBNasC19d4zZbzsu5dZNhqtYLbhnXdALPZuguC',
                            },
                            {
                              mint: 'HTxAAxdiEwJzdwXiUY4xPP8LqytXz21C42i4gZ5qfoF2',
                            },
                            {
                              mint: 'GpKpp7bk4e7Lp9mTJbQ7SR5brBTE1x1qD9dnEfiphMfa',
                            },
                          ],
                        },
                      },
                      pages: {
                        createMany: {
                          data: [
                            {
                              pageNumber: 1,
                              isPreviewable: true,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-1.jpg',
                            },
                            {
                              pageNumber: 2,
                              isPreviewable: true,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-2.jpg',
                            },
                            {
                              pageNumber: 3,
                              isPreviewable: true,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-3.jpg',
                            },
                            {
                              pageNumber: 4,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-4.jpg',
                            },
                            {
                              pageNumber: 5,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-5.jpg',
                            },
                            {
                              pageNumber: 6,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-6.jpg',
                            },
                            {
                              pageNumber: 7,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-7.jpg',
                            },
                            {
                              pageNumber: 8,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-8.jpg',
                            },
                            {
                              pageNumber: 9,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-9.jpg',
                            },
                            {
                              pageNumber: 10,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-10.jpg',
                            },
                            {
                              pageNumber: 11,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-11.jpg',
                            },
                            {
                              pageNumber: 12,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-12.jpg',
                            },
                            {
                              pageNumber: 13,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-13.jpg',
                            },
                            {
                              pageNumber: 14,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-14.jpg',
                            },
                            {
                              pageNumber: 15,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-15.jpg',
                            },
                            {
                              pageNumber: 16,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-16.jpg',
                            },
                            {
                              pageNumber: 17,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-17.jpg',
                            },
                            {
                              pageNumber: 18,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-18.jpg',
                            },
                            {
                              pageNumber: 19,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-19.jpg',
                            },
                            {
                              pageNumber: 20,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-20.jpg',
                            },
                            {
                              pageNumber: 21,
                              isPreviewable: false,
                              image:
                                'creators/swamplabs/comics/the-narentines/issues/narentines-the-purge/pages/page-21.jpg',
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    console.log('Added "Swamplabs" creator');
  } catch (e) {
    console.log('Failed to add "Swamplabs" creator', e);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
