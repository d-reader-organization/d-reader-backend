import { PrismaClient, Role, CarouselLocation } from '@prisma/client';
import { addDays, subDays } from 'date-fns';
import { isEmpty } from 'lodash';
import {
  Bucket,
  copyS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  SeedBucket,
} from '../src/aws/s3client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('⛏️ Emptying the database...');
  await prisma.comicIssueNft.deleteMany();
  await prisma.comicPage.deleteMany();
  await prisma.comicIssue.deleteMany();
  await prisma.walletComic.deleteMany();
  await prisma.comic.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.carouselSlide.deleteMany();

  console.log('✅ Emptied database!');

  console.log(`⛏️ Emptying '${Bucket}' s3 bucket...`);
  const keysToDelete = await listS3FolderKeys({ Prefix: '' });
  if (!isEmpty(keysToDelete)) {
    await deleteS3Objects({
      Delete: { Objects: keysToDelete.map((Key) => ({ Key })) },
    });
  }
  console.log(`✅ Emptied '${Bucket}' s3 bucket!`);

  console.log(`⛏️ Cloning files from '${SeedBucket}' bucket...`);

  const seedFileKeys = await listS3FolderKeys({
    Bucket: SeedBucket,
    Prefix: '',
  });

  for (const seedFileKey of seedFileKeys) {
    const copySource = `/${SeedBucket}/${seedFileKey}`;
    await copyS3Object({ CopySource: copySource, Key: seedFileKey });
    console.log(`🪧 Copied seed file from ${copySource}`);
  }
  console.log(`✅ Cloned files from '${SeedBucket}' s3 bucket!`);

  try {
    await prisma.carouselSlide.createMany({
      data: [
        {
          image: 'carousel/slides/483d6796-e8ae-4379-80d4-4f9390fa3f1e.jpg',
          title: 'Lorem Ipsum',
          subtitle: 'Dolor sit ament, consecitur',
          priority: 1,
          link: 'https://dreader.io/todo',
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 7),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/1c4739b4-c402-459a-98ac-e884a6d51296.jpg',
          title: 'Lorem Ipsum',
          subtitle: 'Dolor sit ament, consecitur',
          priority: 2,
          link: 'https://dreader.io/todo',
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 7),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/3368f69d-a2de-49ae-9001-45f508d029c5.jpg',
          title: 'Lorem Ipsum',
          subtitle: 'Dolor sit ament, consecitur',
          priority: 3,
          link: 'https://dreader.io/todo',
          publishedAt: addDays(new Date(), 1),
          expiredAt: addDays(new Date(), 7),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/deb35549-1f59-45db-9aef-2efc0ee5930a.jpg',
          title: 'Lorem Ipsum',
          subtitle: 'Dolor sit ament, consecitur',
          priority: 4,
          link: 'https://dreader.io/todo',
          publishedAt: subDays(new Date(), 1),
          expiredAt: addDays(new Date(), 7),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/d340e627-a5b2-461c-9323-c277a879593e.png',
          title: 'Lorem Ipsum',
          subtitle: 'Dolor sit ament, consecitur',
          priority: 5,
          link: 'https://dreader.io/todo',
          publishedAt: new Date(),
          expiredAt: subDays(new Date(), 4),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/e0dd2e2c-56d7-421d-afc0-f5e68f944598.png',
          title: 'Lorem Ipsum',
          subtitle: 'Dolor sit ament, consecitur',
          priority: 6,
          link: 'https://dreader.io/todo',
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 7),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/802ff196-544d-41d0-8d17-a1c1c353a317.png',
          title: 'Lorem Ipsum',
          subtitle: 'Dolor sit ament, consecitur',
          priority: 7,
          link: 'https://dreader.io/todo',
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 7),
          location: CarouselLocation.Home,
        },
      ],
    });
    console.log('➕ Added carousel slides');
  } catch (e) {
    console.log('❌ Failed to add carousel slides', e);
  }

  try {
    await prisma.genre.createMany({
      data: [
        {
          name: 'Action',
          slug: 'action',
          deletedAt: null,
          priority: 1,
          icon: 'genres/action/icon.svg',
          color: '#a35',
        },
        {
          name: 'Sci-Fi',
          slug: 'sci-fi',
          deletedAt: null,
          priority: 2,
          icon: 'genres/sci-fi/icon.svg',
          color: '#0f0',
        },
        {
          name: 'Comedy',
          slug: 'comedy',
          deletedAt: null,
          priority: 3,
          icon: 'genres/comedy/icon.svg',
          color: '#00f',
        },
        {
          name: 'Slice of Life',
          slug: 'slice-of-life',
          deletedAt: null,
          priority: 4,
          icon: 'genres/slice-of-life/icon.svg',
          color: '#fff',
        },
        {
          name: 'Romance',
          slug: 'romance',
          deletedAt: null,
          priority: 5,
          icon: 'genres/romance/icon.svg',
          color: '#f00',
        },
        {
          name: 'History',
          slug: 'history',
          deletedAt: null,
          priority: 6,
          icon: 'genres/history/icon.svg',
          color: '#24d',
        },
      ],
    });

    const genres = await prisma.genre.findMany();
    const genreNames = genres.map((genre) => `'${genre.name}'`);
    console.log(`➕ Added comic genres: ${genreNames.join(', ')}`);
  } catch (e) {
    console.log('❌ Failed to add comic genres', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: '7aLBCrbn4jDNSxLLJYRRnKbkqA5cuaeaAzn74xS7eKPD',
        label: 'Superadmin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Superadmin,
      },
    });
    console.log('➕ Added Superadmin wallet');
  } catch (e) {
    console.log('❌ Failed to add Superadmin wallet', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: '3v2V2hBNxxevfyS3J3z6DrPUa7UTi3Ve4y6rByCPqTyP',
        label: 'Superadmin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Superadmin,
      },
    });
    console.log('➕ Added Superadmin wallet');
  } catch (e) {
    console.log('❌ Failed to add Superadmin wallet', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: 'HuZ6UtdfeXgicEpukAU6BCZxAoWpeFNPSgf9yBqwCgRY',
        label: 'Superadmin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Superadmin,
      },
    });
    console.log('➕ Added Superadmin wallet');
  } catch (e) {
    console.log('❌ Failed to add Superadmin wallet', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: '75eLTqY6pfTGhuzXAtRaWYXW9DDPhmX5zStvCjDKDmZ9',
        label: 'Admin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Admin,
      },
    });
    console.log('➕ Added Admin wallet');
  } catch (e) {
    console.log('❌ Failed to add Admin wallet', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: 'DXvYRNGBZmvEcefKSsNh7EcjEw1YgoiHaUtt2HLaX6yL',
        label: 'StudioNX',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
            email: 'adam@studionx.com',
            name: 'StudioNX',
            slug: 'studio-nx',
            avatar: 'creators/studio-nx/avatar.png',
            banner: 'creators/studio-nx/banner.jpg',
            logo: 'creators/studio-nx/logo.png',
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
                genres: {
                  connect: [{ slug: 'action' }, { slug: 'sci-fi' }],
                },
                isMatureAudience: true,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: new Date(),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/studio-nx/comics/gorecats/cover.png',
                pfp: 'creators/studio-nx/comics/gorecats/pfp.png',
                logo: 'creators/studio-nx/comics/gorecats/logo.png',
                website: 'https://gorecats.io',
                twitter: 'https://twitter.com/GORECATS',
                discord: 'https://discord.com/invite/gorecats',
                telegram: 'https://t.me/Gorecats',
                instagram: 'https://www.instagram.com/gorecats_art',
                tikTok: '',
                youTube: '',
                issues: {
                  create: {
                    number: 1,
                    supply: 4,
                    discountMintPrice: 0.1,
                    mintPrice: 0.05,
                    title: 'Rise of the Gorecats',
                    slug: 'rise-of-the-gorecats',
                    description:
                      'A sadistic breed of bloodthirsty critters wreak havoc across the city of catsburg. A washed up detective and his gung ho rookie are the only ones standing in the way of a full on invasion.',
                    flavorText: 'Jesus these cats are so gore',
                    cover:
                      'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/cover.png',
                    soundtrack:
                      'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/soundtrack.mp3',
                    releaseDate: '2022-08-08T08:00:00.000Z',
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
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
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'studio-nx' } },
        name: 'Barbabyans',
        slug: 'barbabyans',
        description:
          '3 magical siblings must prove themselves as the worthy warriors they were destined to become and lead their horde to victory across the land… Or not.',
        flavorText: '“This is so silly, I love it!” - my mom',
        genres: {
          connect: [{ slug: 'action' }, { slug: 'comedy' }, { slug: 'sci-fi' }],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: new Date(),
        popularizedAt: null,
        completedAt: null,
        cover: 'creators/studio-nx/comics/barbabyans/cover.jpg',
        pfp: 'creators/studio-nx/comics/barbabyans/pfp.jpg',
        logo: '',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: {
            number: 1,
            supply: 4,
            discountMintPrice: 0.1,
            mintPrice: 0.05,
            title: "Let's Get Outta Here!",
            slug: 'let-s-get-outta-here',
            description:
              '3 magical siblings must prove themselves as the worthy warriors they were destined to become and lead their horde to victory across the land… Or not.',
            flavorText: '“Chubby babies are so cute” - New York Times',
            cover:
              'creators/studio-nx/comics/barbabyans/issues/let-s-get-outta-here/cover.jpg',
            soundtrack: '',
            releaseDate: '2022-08-08T08:00:00.000Z',
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            publishedAt: new Date(),
            popularizedAt: new Date(),
            pages: {
              createMany: {
                data: [
                  {
                    pageNumber: 1,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans/issues/let-s-get-outta-here/pages/page-1.jpg',
                  },
                  {
                    pageNumber: 2,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans/issues/let-s-get-outta-here/pages/page-2.jpg',
                  },
                  {
                    pageNumber: 3,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans/issues/let-s-get-outta-here/pages/page-3.jpg',
                  },
                  {
                    pageNumber: 4,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans/issues/let-s-get-outta-here/pages/page-4.jpg',
                  },
                  {
                    pageNumber: 5,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans/issues/let-s-get-outta-here/pages/page-5.jpg',
                  },
                ],
              },
            },
          },
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'studio-nx' } },
        name: 'Barbabyans: Limited Edition',
        slug: 'barbabyans-limited-edition',
        description:
          '3 magical siblings must prove themselves as the worthy warriors they were destined to become and lead their horde to victory across the land… Or not.',
        flavorText: '“This is so silly, I love it!” - my mom',
        genres: {
          connect: [{ slug: 'action' }, { slug: 'comedy' }, { slug: 'sci-fi' }],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: new Date(),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/studio-nx/comics/barbabyans-limited-edition/cover.jpg',
        pfp: 'creators/studio-nx/comics/barbabyans-limited-edition/pfp.jpg',
        logo: '',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: {
            number: 1,
            supply: 4,
            discountMintPrice: 0.1,
            mintPrice: 0.05,
            title: "Let's Get In Here!",
            slug: 'let-s-get-in-here',
            description:
              '3 magical siblings must prove themselves as the worthy warriors they were destined to become and lead their horde to victory across the land… Or not.',
            flavorText: '“Chubby babies are so cute” - New York Times',
            cover:
              'creators/studio-nx/comics/barbabyans-limited-edition/issues/let-s-get-in-here/cover.jpg',
            soundtrack: '',
            releaseDate: '2022-08-08T08:00:00.000Z',
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            publishedAt: new Date(),
            popularizedAt: new Date(),
            pages: {
              createMany: {
                data: [
                  {
                    pageNumber: 1,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans-limited-edition/issues/let-s-get-in-here/pages/page-1.jpg',
                  },
                  {
                    pageNumber: 2,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans-limited-edition/issues/let-s-get-in-here/pages/page-2.jpg',
                  },
                  {
                    pageNumber: 3,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans-limited-edition/issues/let-s-get-in-here/pages/page-3.jpg',
                  },
                  {
                    pageNumber: 4,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans-limited-edition/issues/let-s-get-in-here/pages/page-4.jpg',
                  },
                  {
                    pageNumber: 5,
                    isPreviewable: true,
                    image:
                      'creators/studio-nx/comics/barbabyans-limited-edition/issues/let-s-get-in-here/pages/page-5.jpg',
                  },
                ],
              },
            },
          },
        },
      },
    });

    console.log('➕ Added "StudioNX" creator');
  } catch (e) {
    console.log('❌ Failed to add "StudioNX" creator', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: 'AQf9RzGk8WD92AoqCc98CVyEw56AMMKAoiFFasLk1PYQ',
        label: 'Swamplabs',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
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
            createdAt: new Date(),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            popularizedAt: null,
            emailConfirmedAt: new Date(),
            comics: {
              create: {
                name: 'Narentines',
                slug: 'narentines',
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
                isMatureAudience: false,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: new Date(),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/swamplabs/comics/narentines/cover.png',
                pfp: 'creators/swamplabs/comics/narentines/pfp.png',
                logo: 'creators/swamplabs/comics/narentines/logo.png',
                website: 'https://narentines.com',
                twitter: 'https://twitter.com/Narentines',
                discord: 'https://discord.com/invite/narentines',
                telegram: '',
                instagram: '',
                tikTok: '',
                youTube: '',
                issues: {
                  create: {
                    number: 1,
                    supply: 4,
                    discountMintPrice: 0.1,
                    mintPrice: 0.05,
                    title: 'Narentines: The Purge',
                    slug: 'narentines-the-purge',
                    description:
                      "Only but a few left remaining, as a new dawn rose and the Prophet noticed the signs.\\nA new age would start for Narentines, as the great Purge pawes it's path to the Valley",
                    flavorText:
                      'The great stone is destroyed and sacrifise must be made to please the Mighty Abaia',
                    cover:
                      'creators/swamplabs/comics/narentines/issues/narentines-the-purge/cover.png',
                    soundtrack: '',
                    releaseDate: '2022-08-08T08:00:00.000Z',
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
                    pages: {
                      createMany: {
                        data: [
                          {
                            pageNumber: 1,
                            isPreviewable: true,
                            image:
                              'creators/swamplabs/comics/narentines/issues/narentines-the-purge/pages/page-1.jpg',
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
    });
    console.log('➕ Added "Swamplabs" creator');
  } catch (e) {
    console.log('❌ Failed to add "Swamplabs" creator', e);
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
