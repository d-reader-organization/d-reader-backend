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
import * as Utf8 from 'crypto-js/enc-utf8';
import * as AES from 'crypto-js/aes';
import { Keypair } from '@solana/web3.js';
import { getRandomInt } from '../src/utils/helpers';

const prisma = new PrismaClient();

const generatePages = (
  imagePath: string,
  numberOfPages: number,
  fileExtension: 'png' | 'jpg',
) => {
  const indexArray = [...Array(numberOfPages).keys()];

  const pagesData = indexArray.map((i) => {
    const pageNumber = i + 1;
    return {
      pageNumber,
      isPreviewable: pageNumber < 4, // first 3 pages
      image: `${imagePath}/page-${pageNumber}.${fileExtension}`,
    };
  });

  return pagesData;
};

async function main() {
  console.log('⛏️ Emptying the database...');
  await prisma.nft.deleteMany();
  await prisma.collectionNft.deleteMany();
  await prisma.candyMachineReceipt.deleteMany();
  await prisma.candyMachine.deleteMany();
  await prisma.comicPage.deleteMany();
  await prisma.comicIssue.deleteMany();
  await prisma.walletComic.deleteMany();
  await prisma.comic.deleteMany();
  await prisma.newsletter.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.carouselSlide.deleteMany();

  console.log('✅ Emptied database!');

  const skipS3Seed = false;
  if (!skipS3Seed) {
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
  }

  try {
    await prisma.carouselSlide.createMany({
      data: [
        {
          image: 'carousel/slides/1c4739b4-c402-459a-98ac-e884a6d51296.jpg',
          title: 'Art of Niko - new episode',
          subtitle: 'release: March 26th, 10am UTC',
          priority: 1,
          link: 'https://dreader.app/comics/niko-and-the-sword',
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 90),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/deb35549-1f59-45db-9aef-2efc0ee5930a.jpg',
          title: 'Gooneytoons - AMA',
          subtitle: 'release: March 28th, 8am UTC',
          priority: 2,
          link: 'https://dreader.app/comics/gooneytoons',
          publishedAt: subDays(new Date(), 1),
          expiredAt: addDays(new Date(), 90),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/483d6796-e8ae-4379-80d4-4f9390fa3f1e.jpg',
          title: 'The Heist - Reveal',
          subtitle: 'release: April 7th, 10am UTC',
          priority: 3,
          link: 'https://dreader.app/comics/the-heist',
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 90),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/3368f69d-a2de-49ae-9001-45f508d029c5.jpg',
          title: 'Explore new worlds - Lupers',
          subtitle: 'release: April 14th, 10am UTC',
          priority: 4,
          link: 'https://dreader.app/comics/lupers',
          publishedAt: subDays(new Date(), 2),
          expiredAt: addDays(new Date(), 90),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/802ff196-544d-41d0-8d17-a1c1c353a317.jpg',
          title: 'The Narentines: Origin',
          subtitle: 'release: May 1st, 8am UTC',
          priority: 5,
          link: 'https://dreader.app/comics/narentines',
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 90),
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
          name: 'Manga',
          slug: 'manga',
          deletedAt: null,
          priority: 1,
          icon: 'genres/manga/icon.svg',
          color: '#e85a5b',
        },
        {
          name: 'Action',
          slug: 'action',
          deletedAt: null,
          priority: 2,
          icon: 'genres/action/icon.svg',
          color: '#e9a860',
        },
        {
          name: 'Adventure',
          slug: 'adventure',
          deletedAt: null,
          priority: 3,
          icon: 'genres/adventure/icon.svg',
          color: '#87c7e4',
        },
        {
          name: 'Romance',
          slug: 'romance',
          deletedAt: null,
          priority: 4,
          icon: 'genres/romance/icon.svg',
          color: '#e37c8d',
        },
        {
          name: 'Non-fiction',
          slug: 'non-fiction',
          deletedAt: null,
          priority: 5,
          icon: 'genres/non-fiction/icon.svg',
          color: '#8377f2',
        },
        {
          name: 'Comedy',
          slug: 'comedy',
          deletedAt: null,
          priority: 6,
          icon: 'genres/comedy/icon.svg',
          color: '#49c187',
        },
        {
          name: 'Superhero',
          slug: 'superhero',
          deletedAt: null,
          priority: 7,
          icon: 'genres/superhero/icon.svg',
          color: '#3926b4',
        },
        {
          name: 'Sci-fi',
          slug: 'sci-fi',
          deletedAt: null,
          priority: 8,
          icon: 'genres/sci-fi/icon.svg',
          color: '#8200ea',
        },
        {
          name: 'Fantasy',
          slug: 'fantasy',
          deletedAt: null,
          priority: 9,
          icon: 'genres/fantasy/icon.svg',
          color: '#c413e0',
        },
        {
          name: 'History',
          slug: 'history',
          deletedAt: null,
          priority: 10,
          icon: 'genres/history/icon.svg',
          color: '#764e4a',
        },
        {
          name: 'Horror',
          slug: 'horror',
          deletedAt: null,
          priority: 11,
          icon: 'genres/horror/icon.svg',
          color: '#9c000e',
        },
        {
          name: 'Crime',
          slug: 'crime',
          deletedAt: null,
          priority: 12,
          icon: 'genres/crime/icon.svg',
          color: '#3d3e60',
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
    const wallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const keypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(wallet.toString(Utf8))),
    );
    const address = keypair.publicKey.toBase58();

    await prisma.wallet.create({
      data: {
        address,
        label: 'Superadmin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Superadmin,
      },
    });
    console.log('➕ Added Treasury wallet');
  } catch (e) {
    console.log('❌ Failed to add Treasury wallet', e);
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
        address: Keypair.generate().publicKey.toBase58(),
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
                  connect: [
                    { slug: 'horror' },
                    { slug: 'crime' },
                    { slug: 'adventure' },
                    { slug: 'sci-fi' },
                  ],
                },
                isMatureAudience: true,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 9),
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
                    supply: 0,
                    discountMintPrice: 0,
                    mintPrice: 0,
                    title: 'Rise of the Gorecats',
                    slug: 'rise-of-the-gorecats',
                    description:
                      'A sadistic breed of bloodthirsty critters wreak havoc across the city of catsburg. A washed up detective and his gung ho rookie are the only ones standing in the way of a full on invasion.',
                    flavorText: 'Jesus these cats are so gore',
                    cover:
                      'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/cover.png',
                    soundtrack:
                      'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/soundtrack.mp3',
                    releaseDate: subDays(new Date(), 21),
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
                    pages: {
                      createMany: {
                        data: generatePages(
                          'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/pages',
                          22,
                          'png',
                        ),
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
          '3 magical siblings must prove themselves as the worthy warriors they were destined to become and lead their horde to victory across the land, or not.',
        flavorText: '“This is so silly, I love it!” - my mom',
        genres: {
          connect: [
            { slug: 'adventure' },
            { slug: 'comedy' },
            { slug: 'fantasy' },
            { slug: 'superhero' },
            { slug: 'action' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 12),
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
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0,
              mintPrice: 0,
              title: 'Adventure Begins!',
              slug: 'adventure-begins',
              description:
                '3 chubby siblings embark on their first adventure. They discover a magical land and encounter various obstacles.',
              flavorText: '“Chubby babies are so cute” - New York Times',
              cover:
                'creators/studio-nx/comics/barbabyans/issues/adventure-begins/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 23),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/studio-nx/comics/barbabyans/issues/adventure-begins/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
            {
              number: 2,
              supply: 0,
              discountMintPrice: 0,
              mintPrice: 0,
              title: 'Red Hawk Down',
              slug: 'red-hawk-down',
              description:
                'Fearless siblings come across a red hawk that has been injured. They work together to help nurse the hawk.',
              flavorText: '“Chubby babies are so cute” - New York Times',
              cover:
                'creators/studio-nx/comics/barbabyans/issues/red-hawk-down/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 22),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/studio-nx/comics/barbabyans/issues/red-hawk-down/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
            {
              number: 3,
              supply: 0,
              discountMintPrice: 0,
              mintPrice: 0,
              title: "Let's Get Outta Here!",
              slug: 'let-s-get-outta-here',
              description:
                'Our heroes find themselves in a dangerous situation and must escape. Will their wit be enough?',
              flavorText: '“Chubby babies are so cute” - New York Times',
              cover:
                'creators/studio-nx/comics/barbabyans/issues/let-s-get-outta-here/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 21),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/studio-nx/comics/barbabyans/issues/red-hawk-down/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
            {
              number: 4,
              supply: 0,
              discountMintPrice: 0,
              mintPrice: 0,
              title: 'A cheesy quest for good food',
              slug: 'a-cheesy-quest-for-good-food',
              description:
                'Babies are set out on a journey to find the best cheese in the land as they encounter challenges and obstacles along the way.',
              flavorText: '“Chubby babies are so cute” - New York Times',
              cover:
                'creators/studio-nx/comics/barbabyans/issues/a-cheesy-quest-for-good-food/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 21),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/studio-nx/comics/barbabyans/issues/a-cheesy-quest-for-good-food/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'studio-nx' } },
        name: 'Niko and the Sword',
        slug: 'niko-and-the-sword',
        description:
          'His people gone. His kingdom a smouldering ruin. Follow the perilous adventures of Niko',
        flavorText: "“I'm just getting started!” - Niko",
        genres: {
          connect: [
            { slug: 'adventure' },
            { slug: 'fantasy' },
            { slug: 'superhero' },
            { slug: 'action' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 15),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/studio-nx/comics/niko-and-the-sword/cover.png',
        pfp: 'creators/studio-nx/comics/niko-and-the-sword/pfp.png',
        logo: 'creators/studio-nx/comics/niko-and-the-sword/logo.png',
        website: 'https://www.artofniko.com/',
        twitter: 'https://twitter.com/StudioNX',
        discord: '',
        telegram: '',
        instagram: 'https://www.instagram.com/jim_bryson/',
        tikTok: '',
        youTube: 'https://www.youtube.com/channel/UCHGZaHM8q9aag4kXfZTq45w',
        issues: {
          create: {
            number: 1,
            supply: 0,
            discountMintPrice: 0.0,
            mintPrice: 0.0,
            title: 'Introduction',
            slug: 'introduction',
            description:
              'His people gone. His kingdom a smouldering ruin. Follow the perilous adventures of Niko',
            flavorText: "“I'm just getting started!” - Niko",
            cover:
              'creators/studio-nx/comics/niko-and-the-sword/issues/introduction/cover.png',
            soundtrack: '',
            releaseDate: subDays(new Date(), 17),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            publishedAt: new Date(),
            popularizedAt: new Date(),
            pages: {
              createMany: {
                data: generatePages(
                  'creators/studio-nx/comics/niko-and-the-sword/issues/introduction/pages',
                  5,
                  'png',
                ),
              },
            },
          },
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'studio-nx' } },
        name: 'The Dark Portal',
        slug: 'the-dark-portal',
        description:
          ' A spirited Elf girl and a tearaway Frog Pirate embark on a magical quest to save their forest from invasion by a devious alien race known as the Mindbenders.',
        flavorText: 'Nothing more exciting than frog pirates!',
        genres: {
          connect: [
            { slug: 'adventure' },
            { slug: 'fantasy' },
            { slug: 'superhero' },
            { slug: 'action' },
            { slug: 'sci-fi' },
            { slug: 'romance' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 18),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/studio-nx/comics/the-dark-portal/cover.jpg',
        pfp: 'creators/studio-nx/comics/the-dark-portal/pfp.jpg',
        logo: 'creators/studio-nx/comics/the-dark-portal/logo.jpg',
        website: 'https://www.studionx.com/',
        twitter: 'https://twitter.com/StudioNX',
        discord: '',
        telegram: '',
        instagram: 'https://www.instagram.com/jim_bryson/',
        tikTok: '',
        youTube: 'https://www.youtube.com/channel/UCHGZaHM8q9aag4kXfZTq45w',
        issues: {
          create: {
            number: 1,
            supply: 0,
            discountMintPrice: 0.0,
            mintPrice: 0.0,
            title: 'Concept Art',
            slug: 'concept-art',
            description:
              ' A spirited Elf girl and a tearaway Frog Pirate embark on a magical quest to save their forest from invasion by a devious alien race known as the Mindbenders.',
            flavorText: 'Lovely pieces put by Jim Bryson',
            cover:
              'creators/studio-nx/comics/the-dark-portal/issues/concept-art/cover.png',
            soundtrack: '',
            releaseDate: subDays(new Date(), 15),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            publishedAt: new Date(),
            popularizedAt: new Date(),
            pages: {
              createMany: {
                data: generatePages(
                  'creators/studio-nx/comics/the-dark-portal/issues/concept-art/pages',
                  9,
                  'jpg',
                ),
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
        address: Keypair.generate().publicKey.toBase58(),
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
                  "Hidden from human eyes lived a great nation in the vast valley of Neretva. It's origin and numbers unknown, it's practices a complete mystery. A young boy discovers what seems to be a completely new species.",
                flavorText:
                  'Unique and intriguing Sci-Fi with a sprinkle of history on top of it. Brilliant! - The Journal',
                genres: {
                  connect: [
                    { slug: 'manga' },
                    { slug: 'action' },
                    { slug: 'adventure' },
                    { slug: 'romance' },
                    { slug: 'fantasy' },
                  ],
                },
                isMatureAudience: false,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 17),
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
                    supply: 0,
                    discountMintPrice: 0,
                    mintPrice: 0,
                    title: 'Narentines: The Purge',
                    slug: 'narentines-the-purge',
                    description:
                      "Only but a few left remaining, as a new dawn rose and the Prophet noticed the signs. A new age would start for Narentines, as the great Purge pawes it's path to the Valley",
                    flavorText:
                      'The great stone is destroyed and sacrifise must be made to please the Mighty Abaia',
                    cover:
                      'creators/swamplabs/comics/narentines/issues/narentines-the-purge/cover.png',
                    soundtrack: '',
                    releaseDate: subDays(new Date(), 17),
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
                    pages: {
                      createMany: {
                        data: generatePages(
                          'creators/swamplabs/comics/narentines/issues/narentines-the-purge/pages',
                          1,
                          'jpg',
                        ),
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
        creator: { connect: { slug: 'swamplabs' } },
        name: 'Lupers',
        slug: 'lupers',
        description:
          'The Lupers of Arx Urbis are a proud and noble race of wolves descended from the she-wolf of Lupercal, who raised Romulus and Remus',
        flavorText: 'Nothing more exciting than wolf stories!',
        genres: {
          connect: [
            { slug: 'fantasy' },
            { slug: 'action' },
            { slug: 'sci-fi' },
            { slug: 'romance' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 17),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/swamplabs/comics/lupers/cover.jpg',
        pfp: 'creators/swamplabs/comics/lupers/pfp.jpg',
        logo: 'creators/swamplabs/comics/lupers/logo.png',
        website: 'https://narentines.com',
        twitter: 'https://twitter.com/Narentines',
        discord: 'https://discord.com/invite/narentines',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Canis Lupers',
              slug: 'canis-lupers',
              description:
                'The Lupers of Arx Urbis are a proud and noble race of wolves descended from the she-wolf of Lupercal, who raised Romulus and Remus',
              flavorText: 'Placeholder flavor text',
              cover:
                'creators/swamplabs/comics/lupers/issues/canis-lupers/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 21),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/swamplabs/comics/lupers/issues/canis-lupers/pages',
                    1,
                    'jpg',
                  ),
                },
              },
            },
            {
              number: 2,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Godiary: Ionus',
              slug: 'godiary-ionus',
              description:
                'Ionus is the god of sky and thunder. He is also the god of the city, order, and oaths.',
              flavorText: 'Placeholder flavor text',
              cover:
                'creators/swamplabs/comics/lupers/issues/godiary-ionus/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 19),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/swamplabs/comics/lupers/issues/godiary-ionus/pages',
                    1,
                    'jpg',
                  ),
                },
              },
            },
            {
              number: 3,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Godiary: Diluna',
              slug: 'godiary-diluna',
              description:
                'The most important deity is Diluna, the goddess of the hunt and the moon',
              flavorText: 'Placeholder flavor text',
              cover:
                'creators/swamplabs/comics/lupers/issues/godiary-diluna/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 18),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/swamplabs/comics/lupers/issues/godiary-diluna/pages',
                    1,
                    'jpg',
                  ),
                },
              },
            },
            {
              number: 4,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Godiary: Nuptus',
              slug: 'godiary-nuptus',
              description:
                'Nuptus is god of rivers, springs and waters. He is the patron of fishermen, and protector of rivers',
              flavorText: 'Placeholder flavor text',
              cover:
                'creators/swamplabs/comics/lupers/issues/godiary-nuptus/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 15),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/swamplabs/comics/lupers/issues/godiary-nuptus/pages',
                    1,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    console.log('➕ Added "Swamplabs" creator');
  } catch (e) {
    console.log('❌ Failed to add "Swamplabs" creator', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: Keypair.generate().publicKey.toBase58(),
        label: 'Longwood Labs',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
            email: 'john.smith@longwood-labs.com',
            name: 'Longwood Labs',
            slug: 'longwood-labs',
            avatar: 'creators/longwood-labs/avatar.jpg',
            banner: 'creators/longwood-labs/banner.jpg',
            logo: 'creators/longwood-labs/logo.png',
            description:
              'Web3 idle gaming studio | Creators of @RemnantsNFT & @playtheheist',
            flavorText: 'The best gaming studio in web3',
            website: 'https://theremnants.app/',
            createdAt: new Date(),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            popularizedAt: null,
            emailConfirmedAt: new Date(),
            comics: {
              create: {
                name: 'The Heist',
                slug: 'the-heist',
                description:
                  'A high-stakes, risk-based adventure of crime, corruption...and bananas.',
                flavorText: 'Bananas 🍌',
                genres: {
                  connect: [
                    { slug: 'manga' },
                    { slug: 'action' },
                    { slug: 'adventure' },
                    { slug: 'fantasy' },
                  ],
                },
                isMatureAudience: false,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 14),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/longwood-labs/comics/the-heist/cover.jpg',
                pfp: 'creators/longwood-labs/comics/the-heist/pfp.jpg',
                logo: '',
                website: 'https://theheist.game/',
                twitter: 'https://twitter.com/playtheheist',
                discord: 'https://discord.com/invite/playtheheist',
                telegram: '',
                instagram: '',
                tikTok: '',
                youTube: '',
                issues: {
                  create: {
                    number: 1,
                    supply: 0,
                    discountMintPrice: 0,
                    mintPrice: 0,
                    title: 'How It All Began',
                    slug: 'how-it-all-began',
                    description:
                      'A high-stakes, risk-based adventure of crime, corruption...and bananas.',
                    flavorText: 'Bananas 🍌',

                    cover:
                      'creators/longwood-labs/comics/the-heist/issues/how-it-all-began/cover.jpg',
                    soundtrack: '',
                    releaseDate: subDays(new Date(), 14),
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
                    pages: {
                      createMany: {
                        data: generatePages(
                          'creators/longwood-labs/comics/the-heist/issues/how-it-all-began/pages',
                          1,
                          'jpg',
                        ),
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
        creator: { connect: { slug: 'longwood-labs' } },
        name: 'The Remnants',
        slug: 'the-remnants',
        description: 'A short comic that got published in KOMIKAZE #54 webzine',
        flavorText: '“No matter how many zombies, we keep resisting”',
        genres: {
          connect: [
            { slug: 'fantasy' },
            { slug: 'action' },
            { slug: 'romance' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 20),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/longwood-labs/comics/the-remnants/cover.png',
        pfp: 'creators/longwood-labs/comics/the-remnants/pfp.jpg',
        logo: '',
        website: 'https://theremnants.app',
        twitter: 'https://twitter.com/RemnantsNFT',
        discord: 'https://discord.com/invite/RemnantsNFT',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'All Alone',
              slug: 'all-alone',
              description:
                'Matija finds himself knocked down & locked in the prison all alone.',
              flavorText: '“I wonder what I can do with these bolt cutters”',
              cover:
                'creators/longwood-labs/comics/the-remnants/issues/all-alone/cover.png',
              soundtrack: '',
              releaseDate: subDays(new Date(), 22),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/longwood-labs/comics/the-remnants/issues/all-alone/pages',
                    1,
                    'png',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    console.log('➕ Added "Longwood Labs" creator');
  } catch (e) {
    console.log('❌ Failed to add "Longwood Labs" creator', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: Keypair.generate().publicKey.toBase58(),
        label: 'Gooneytoons',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
            email: 'john.smith@gooneytoons.studio',
            name: 'Gooneytoons Studio',
            slug: 'gooneytoons-studio',
            avatar: 'creators/gooneytoons-studio/avatar.png',
            banner: 'creators/gooneytoons-studio/banner.png',
            logo: 'creators/gooneytoons-studio/logo.png',
            description:
              'In an underground lab located somewhere in the frigid tundra of Alaska, an unnamed and highly intoxicated scientist is on a quest to genetically engineer The Gooney Toons.',
            flavorText: '“Such nasty little creatures” - My dad',
            website: 'https://gooneytoons.studio/',
            createdAt: new Date(),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            popularizedAt: null,
            emailConfirmedAt: new Date(),
            comics: {
              create: {
                name: 'Gooneytoons',
                slug: 'gooneytoons',
                description:
                  "Some say this is a twisted nostalgia trip fuelled by too much LSD, or maybe it's that some men just want to see the world burn...",
                flavorText: '“Such nasty little creatures” - My dad',
                genres: {
                  connect: [
                    { slug: 'action' },
                    { slug: 'adventure' },
                    { slug: 'sci-fi' },
                  ],
                },
                isMatureAudience: true,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 14),
                popularizedAt: null,
                completedAt: null,
                cover:
                  'creators/gooneytoons-studio/comics/gooneytoons/cover.png',
                pfp: 'creators/gooneytoons-studio/comics/gooneytoons/pfp.png',
                logo: 'creators/gooneytoons-studio/comics/gooneytoons/logo.png',
                website: 'https://gooneytoons.studio/',
                twitter: 'https://twitter.com/GooneyToonsNFT',
                discord: 'https://discord.com/invite/gooneytoons',
                telegram: '',
                instagram: 'https://www.instagram.com/gooneytoons.nft/',
                tikTok: '',
                youTube: '',
                issues: {
                  create: [
                    {
                      number: 1,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Birth of The Gooneys',
                      slug: 'birth-of-the-gooneys',
                      description:
                        'Some say this is a twisted nostalgia trip fuelled by too much LSD...',
                      flavorText: '“Such nasty little creatures” - My dad',
                      cover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/birth-of-the-gooneys/cover.png',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 19),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/gooneytoons-studio/comics/gooneytoons/issues/birth-of-the-gooneys/pages',
                            1,
                            'jpg',
                          ),
                        },
                      },
                    },
                    {
                      number: 2,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Carnage of The Gooneys',
                      slug: 'carnage-of-the-gooneys',
                      description:
                        'Some say this is a twisted nostalgia trip fuelled by too much LSD...',
                      flavorText: '“Such nasty little creatures” - My dad',
                      cover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/carnage-of-the-gooneys/cover.jpg',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 18),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/gooneytoons-studio/comics/gooneytoons/issues/carnage-of-the-gooneys/pages',
                            1,
                            'jpg',
                          ),
                        },
                      },
                    },
                    {
                      number: 3,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Mutation of The Gooneys',
                      slug: 'mutation-of-the-gooneys',
                      description:
                        'Some say this is a twisted nostalgia trip fuelled by too much LSD...',
                      flavorText: '“Such nasty little creatures” - My dad',
                      cover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/mutation-of-the-gooneys/cover.jpg',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 17),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/gooneytoons-studio/comics/gooneytoons/issues/mutation-of-the-gooneys/pages',
                            1,
                            'jpg',
                          ),
                        },
                      },
                    },
                    {
                      number: 4,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Release of The Gooneys',
                      slug: 'release-of-the-gooneys',
                      description:
                        'Some say this is a twisted nostalgia trip fuelled by too much LSD...',
                      flavorText: '“Such nasty little creatures” - My dad',
                      cover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/release-of-the-gooneys/cover.jpg',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 16),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/gooneytoons-studio/comics/gooneytoons/issues/release-of-the-gooneys/pages',
                            1,
                            'jpg',
                          ),
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    console.log('➕ Added "Gonneytoons" creator');
  } catch (e) {
    console.log('❌ Failed to add "Gonneytoons" creator', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: Keypair.generate().publicKey.toBase58(),
        label: 'Saucerpen',
        avatar: 'creators/saucerpen/avatar.jpg',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
            email: 'contact@korinahunjak.com',
            name: 'Saucerpen',
            slug: 'saucerpen',
            avatar: 'creators/saucerpen/avatar.jpg',
            banner: 'creators/saucerpen/banner.jpg',
            logo: 'creators/saucerpen/logo.png',
            description:
              'Hello! I am an illustrator, comic artist and graphic designer from Rijeka, Croatia',
            flavorText: '“Amazing artist & illustrator” - Academy of Fine Arts',
            website: 'https://korinahunjak.com/',
            createdAt: new Date(),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            popularizedAt: null,
            emailConfirmedAt: new Date(),
            comics: {
              create: {
                name: 'Animosities',
                slug: 'animosities',
                description: 'Short comic about love, anger, and treachery',
                flavorText:
                  '“This story will fill you with hate and sorrow” - NYT',
                genres: {
                  connect: [
                    { slug: 'romance' },
                    { slug: 'action' },
                    { slug: 'fantasy' },
                    { slug: 'horror' },
                  ],
                },
                isMatureAudience: true,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 13),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/saucerpen/comics/animosities/cover.jpeg',
                pfp: 'creators/saucerpen/comics/animosities/pfp.jpeg',
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
                    supply: 0,
                    discountMintPrice: 0,
                    mintPrice: 0,
                    title: 'Episode 1',
                    slug: 'episode-1',
                    description: 'Short comic about love, anger, and treachery',
                    flavorText:
                      '“This story will fill you with hate and sorrow” - NYT',
                    cover:
                      'creators/saucerpen/comics/animosities/issues/episode-1/cover.jpeg',
                    soundtrack: '',
                    releaseDate: subDays(new Date(), 20),
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
                    pages: {
                      createMany: {
                        data: generatePages(
                          'creators/saucerpen/comics/animosities/issues/episode-1/pages',
                          6,
                          'jpg',
                        ),
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
        creator: { connect: { slug: 'saucerpen' } },
        name: 'Birthday',
        slug: 'birthday',
        description: 'A short comic that got published in KOMIKAZE #54 webzine',
        flavorText: '“So lovely” - my mom',
        genres: {
          connect: [{ slug: 'romance' }],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 19),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/saucerpen/comics/birthday/cover.jpg',
        pfp: '',
        logo: '',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Episode 1',
              slug: 'episode-1',
              description:
                'A short comic that got published in KOMIKAZE #54 webzine',
              flavorText: '“So lovely” - my mom',
              cover:
                'creators/saucerpen/comics/birthday/issues/episode-1/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 16),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/saucerpen/comics/birthday/issues/episode-1/pages',
                    4,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'saucerpen' } },
        name: 'Immaculate Taint',
        slug: 'immaculate-taint',
        description:
          'lady Kuga (the Plague) goes from village to village and likes being clean',
        flavorText: '',
        genres: {
          connect: [
            { slug: 'fantasy' },
            { slug: 'horror' },
            { slug: 'adventure' },
          ],
        },
        isMatureAudience: true,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 15),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/saucerpen/comics/immaculate-taint/cover.jpg',
        pfp: 'creators/saucerpen/comics/immaculate-taint/pfp.jpg',
        logo: '',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Episode 1',
              slug: 'episode-1',
              description:
                'lady Kuga (the Plague) goes from village to village and likes being clean',
              flavorText: '',
              cover:
                'creators/saucerpen/comics/immaculate-taint/issues/episode-1/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 19),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/saucerpen/comics/immaculate-taint/issues/episode-1/pages',
                    8,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'saucerpen' } },
        name: 'Island',
        slug: 'island',
        description: 'Summer vacation spent on the island of Susak',
        flavorText: '',
        genres: {
          connect: [
            { slug: 'romance' },
            { slug: 'adventure' },
            { slug: 'non-fiction' },
          ],
        },
        isMatureAudience: true,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 16),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/saucerpen/comics/island/cover.jpg',
        pfp: 'creators/saucerpen/comics/island/pfp.jpg',
        logo: '',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Episode 1',
              slug: 'episode-1',
              description: 'Summer vacation spent on the island of Susak',
              flavorText: '',
              cover:
                'creators/saucerpen/comics/island/issues/episode-1/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 14),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/saucerpen/comics/island/issues/episode-1/pages',
                    11,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'saucerpen' } },
        name: 'Lamia',
        slug: 'lamia',
        description: 'Compositinal study of a preraphaelite painting "Lamia"',
        flavorText: '',
        genres: {
          connect: [
            { slug: 'romance' },
            { slug: 'adventure' },
            { slug: 'history' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 18),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/saucerpen/comics/lamia/cover.jpg',
        pfp: 'creators/saucerpen/comics/lamia/pfp.jpg',
        logo: '',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'True Love',
              slug: 'true-love',
              description:
                'Compositinal study of a preraphaelite painting "Lamia"',
              flavorText: '',
              cover:
                'creators/saucerpen/comics/lamia/issues/true-love/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 17),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/saucerpen/comics/lamia/issues/true-love/pages',
                    1,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    console.log('➕ Added "Saucerpen" creator');
  } catch (e) {
    console.log('❌ Failed to add "Saucerpen" creator', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: Keypair.generate().publicKey.toBase58(),
        label: 'Roach Writes',
        avatar: 'creators/roach-writes/avatar.png',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
            email: 'contact@jameseroche.com',
            name: 'Roach Writes',
            slug: 'roach-writes',
            avatar: 'creators/roach-writes/avatar.png',
            banner: 'creators/roach-writes/banner.jpg',
            logo: 'creators/roach-writes/logo.png',
            description:
              'I host "Comic Book Writers on Writing" show, where I get to talk with other writers about everything from their creative process, to writing advise, the business side, crowdfunding, collaborating, and everything in between',
            flavorText: '“A clever and goofy storyteller.” - Heather Antos',
            website: 'https://www.jameseroche.com',
            createdAt: new Date(),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            popularizedAt: null,
            emailConfirmedAt: new Date(),
            comics: {
              create: {
                name: 'Wretches',
                slug: 'wretches',
                description:
                  'Wretches is a gritty sci-fi tale blending the drama of Blade Runner with the wild, action-packed science-fantasy world of The Fifth Element.',
                flavorText: 'This is a story about family. About loss.',
                genres: {
                  connect: [
                    { slug: 'sci-fi' },
                    { slug: 'action' },
                    { slug: 'adventure' },
                    { slug: 'fantasy' },
                  ],
                },
                isMatureAudience: false,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 11),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/roach-writes/comics/wretches/cover.jpg',
                pfp: 'creators/roach-writes/comics/wretches/pfp.jpg',
                logo: 'creators/roach-writes/comics/wretches/logo.jpg',
                website: '',
                twitter: '',
                discord: '',
                telegram: '',
                instagram: '',
                tikTok: '',
                youTube: '',
                issues: {
                  create: [
                    {
                      number: 1,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Issue 1',
                      slug: 'issue-1',
                      description:
                        'Wretches is a gritty sci-fi tale blending the drama of Blade Runner with the wild, action-packed science-fantasy world of The Fifth Element.',
                      flavorText: 'This is a story about family. About loss.',
                      cover:
                        'creators/roach-writes/comics/wretches/issues/issue-1/cover.jpg',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 22),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/roach-writes/comics/wretches/issues/issue-1/pages',
                            7,
                            'jpg',
                          ),
                        },
                      },
                    },
                    {
                      number: 2,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Issue 2',
                      slug: 'issue-2',
                      description:
                        'Wretches is a gritty sci-fi tale blending the drama of Blade Runner with the wild, action-packed science-fantasy world of The Fifth Element.',
                      flavorText: 'This is a story about family. About loss.',
                      cover:
                        'creators/roach-writes/comics/wretches/issues/issue-2/cover.jpg',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 19),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/roach-writes/comics/wretches/issues/issue-2/pages',
                            6,
                            'jpg',
                          ),
                        },
                      },
                    },
                    {
                      number: 3,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Issue 3',
                      slug: 'issue-3',
                      description:
                        'Wretches is a gritty sci-fi tale blending the drama of Blade Runner with the wild, action-packed science-fantasy world of The Fifth Element.',
                      flavorText: 'This is a story about family. About loss.',
                      cover:
                        'creators/roach-writes/comics/wretches/issues/issue-3/cover.jpg',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 18),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/roach-writes/comics/wretches/issues/issue-3/pages',
                            6,
                            'jpg',
                          ),
                        },
                      },
                    },
                    {
                      number: 4,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Issue 4',
                      slug: 'issue-4',
                      description:
                        'Wretches is a gritty sci-fi tale blending the drama of Blade Runner with the wild, action-packed science-fantasy world of The Fifth Element.',
                      flavorText: 'This is a story about family. About loss.',
                      cover:
                        'creators/roach-writes/comics/wretches/issues/issue-4/cover.png',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 16),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/roach-writes/comics/wretches/issues/issue-4/pages',
                            5,
                            'jpg',
                          ),
                        },
                      },
                    },
                    {
                      number: 5,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Issue 5',
                      slug: 'issue-5',
                      description:
                        'Wretches is a gritty sci-fi tale blending the drama of Blade Runner with the wild, action-packed science-fantasy world of The Fifth Element.',
                      flavorText: 'This is a story about family. About loss.',
                      cover:
                        'creators/roach-writes/comics/wretches/issues/issue-5/cover.jpg',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 15),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/roach-writes/comics/wretches/issues/issue-5/pages',
                            6,
                            'jpg',
                          ),
                        },
                      },
                    },
                    {
                      number: 6,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      title: 'Issue 6',
                      slug: 'issue-6',
                      description:
                        'Wretches is a gritty sci-fi tale blending the drama of Blade Runner with the wild, action-packed science-fantasy world of The Fifth Element.',
                      flavorText: 'This is a story about family. About loss.',
                      cover:
                        'creators/roach-writes/comics/wretches/issues/issue-6/cover.jpg',
                      soundtrack: '',
                      releaseDate: subDays(new Date(), 12),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/roach-writes/comics/wretches/issues/issue-6/pages',
                            5,
                            'jpg',
                          ),
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'roach-writes' } },
        name: 'Jana',
        slug: 'jana',
        description: 'Jana and the tower of Want',
        flavorText: '',
        genres: {
          connect: [
            { slug: 'romance' },
            { slug: 'adventure' },
            { slug: 'fantasy' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 16),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/roach-writes/comics/jana/cover.jpg',
        pfp: 'creators/roach-writes/comics/jana/pfp.jpg',
        logo: 'creators/roach-writes/comics/jana/logo.jpg',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Issue 1',
              slug: 'issue-1',
              description: 'Jana and the tower of Want',
              flavorText: '',
              cover:
                'creators/roach-writes/comics/jana/issues/issue-1/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 20),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/roach-writes/comics/jana/issues/issue-1/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
            {
              number: 2,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Issue 2',
              slug: 'issue-2',
              description: 'Jana and the tower of Want',
              flavorText: '',
              cover:
                'creators/roach-writes/comics/jana/issues/issue-2/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 19),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/roach-writes/comics/jana/issues/issue-2/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'roach-writes' } },
        name: 'Knockturn County',
        slug: 'knockturn-county',
        description:
          "Knockturn County is an adult crime noir set in a classic children's book universe. It's as if Dr. Seuss took a few swigs of whimsical whiskey and ran amok through Sin City.",
        flavorText:
          '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
        genres: {
          connect: [
            { slug: 'comedy' },
            { slug: 'crime' },
            { slug: 'non-fiction' },
            { slug: 'adventure' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 15),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/roach-writes/comics/knockturn-county/cover.jpg',
        pfp: 'creators/roach-writes/comics/knockturn-county/pfp.jpg',
        logo: 'creators/roach-writes/comics/knockturn-county/logo.jpg',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Issue 1',
              slug: 'issue-1',
              description:
                "Knockturn County is an adult crime noir set in a classic children's book universe. It's as if Dr. Seuss took a few swigs of whimsical whiskey and ran amok through Sin City.",
              flavorText:
                '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
              cover:
                'creators/roach-writes/comics/knockturn-county/issues/issue-1/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 17),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/roach-writes/comics/knockturn-county/issues/issue-1/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
            {
              number: 2,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Issue 2',
              slug: 'issue-2',
              description:
                "Knockturn County is an adult crime noir set in a classic children's book universe. It's as if Dr. Seuss took a few swigs of whimsical whiskey and ran amok through Sin City.",
              flavorText:
                '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
              cover:
                'creators/roach-writes/comics/knockturn-county/issues/issue-2/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 16),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/roach-writes/comics/knockturn-county/issues/issue-2/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'roach-writes' } },
        name: 'Painted Pray',
        slug: 'painted-pray',
        description: 'Life in Savannah dessert',
        flavorText: 'Amazing and inspiring story! - IDW',
        genres: {
          connect: [{ slug: 'non-fiction' }],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 19),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/roach-writes/comics/painted-pray/cover.jpg',
        pfp: 'creators/roach-writes/comics/painted-pray/pfp.jpg',
        logo: 'creators/roach-writes/comics/painted-pray/logo.jpg',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Issue 1',
              slug: 'issue-1',
              description: 'Life in Savannah dessert',
              flavorText: 'Amazing and inspiring story! - IDW',
              cover:
                'creators/roach-writes/comics/painted-pray/issues/issue-1/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 15),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/roach-writes/comics/painted-pray/issues/issue-1/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'roach-writes' } },
        name: 'Dark Waters',
        slug: 'dark-waters',
        description: 'Proceeds go to the Ronald McDonald House charity',
        flavorText: 'Amazing and inspiring story! - IDW',
        genres: {
          connect: [
            { slug: 'non-fiction' },
            { slug: 'crime' },
            { slug: 'romance' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 21),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/roach-writes/comics/dark-waters/cover.jpg',
        pfp: 'creators/roach-writes/comics/dark-waters/pfp.jpg',
        logo: 'creators/roach-writes/comics/dark-waters/logo.jpg',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Treacherous Seas',
              slug: 'treacherous-seas',
              description: 'Proceeds go to the Ronald McDonald House charity',
              flavorText: 'Amazing and inspiring story! - IDW',
              cover:
                'creators/roach-writes/comics/dark-waters/issues/treacherous-seas/cover.jpg',
              soundtrack: '',
              releaseDate: subDays(new Date(), 21),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/roach-writes/comics/dark-waters/issues/treacherous-seas/pages',
                    5,
                    'jpg',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'roach-writes' } },
        name: 'Multi-Versus',
        slug: 'multi-versus',
        description:
          'This story follows the adventures of a group of skilled warriors who travel across parallel universes, battling powerful enemies and uncovering the mysteries of the multiverse.',
        flavorText: 'Amazing and inspiring story! - IDW',
        genres: {
          connect: [
            { slug: 'manga' },
            { slug: 'sci-fi' },
            { slug: 'fantasy' },
            { slug: 'adventure' },
            { slug: 'comedy' },
          ],
        },
        isMatureAudience: false,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 10),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/roach-writes/comics/multi-versus/cover.png',
        pfp: '',
        logo: '',
        website: '',
        twitter: '',
        discord: '',
        telegram: '',
        instagram: '',
        tikTok: '',
        youTube: '',
        issues: {
          create: [
            {
              number: 1,
              supply: 0,
              discountMintPrice: 0.0,
              mintPrice: 0.0,
              title: 'Episode 1',
              slug: 'episode-1',
              description:
                'This story follows the adventures of a group of skilled warriors who travel across parallel universes, battling powerful enemies and uncovering the mysteries of the multiverse.',
              flavorText: 'Amazing and inspiring story! - IDW',
              cover:
                'creators/roach-writes/comics/multi-versus/issues/episode-1/cover.png',
              soundtrack: '',
              releaseDate: subDays(new Date(), 18),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/roach-writes/comics/multi-versus/issues/episode-1/pages',
                    5,
                    'png',
                  ),
                },
              },
            },
          ],
        },
      },
    });

    console.log('➕ Added "Roach Writes" creator');
  } catch (e) {
    console.log('❌ Failed to add "Roach Writes" creator', e);
  }

  try {
    // 10 dummy wallets
    const indexArray = [...Array(10).keys()];
    const walletArray = indexArray.map(() =>
      Keypair.generate().publicKey.toBase58(),
    );

    const comics = await prisma.comic.findMany({ select: { slug: true } });
    const comicSlugs = comics.map((c) => c.slug);

    const comicIssues = await prisma.comicIssue.findMany({
      select: { id: true },
    });
    const comicIssueIds = comicIssues.map((c) => c.id);

    let i = 1;
    for (const walletAddress of walletArray) {
      console.log(i, ' ➕ Adding wallet ' + walletAddress);
      await prisma.wallet.create({ data: { address: walletAddress } });

      // await Promise.all(
      //   comicSlugs.map(async (comicSlug) => {
      //     await prisma.walletComic.create({
      //       data: {
      //         walletAddress,
      //         comicSlug,
      //         isFavourite: getRandomInt(0, 10) > 5,
      //         isSubscribed: getRandomInt(0, 10) > 5,
      //         viewedAt: getRandomInt(0, 10) > 5 ? new Date() : undefined,
      //         rating: getRandomInt(0, 10) > 3 ? getRandomInt(3, 5) : undefined,
      //       },
      //     });
      //   }),
      // );

      // await Promise.all(
      //   comicIssueIds.map(async (comicIssueId) => {
      //     await prisma.walletComicIssue.create({
      //       data: {
      //         walletAddress,
      //         comicIssueId,
      //         isFavourite: getRandomInt(0, 10) > 5,
      //         isSubscribed: getRandomInt(0, 10) > 5,
      //         viewedAt: getRandomInt(0, 10) > 5 ? new Date() : undefined,
      //         readAt: getRandomInt(0, 10) > 4 ? new Date() : undefined,
      //         rating: getRandomInt(0, 10) > 3 ? getRandomInt(3, 5) : undefined,
      //       },
      //     });
      //   }),
      // );

      for (const comicSlug of comicSlugs) {
        const shouldRate = getRandomInt(0, 10) > 7;
        await prisma.walletComic.create({
          data: {
            walletAddress,
            comicSlug,
            isFavourite: getRandomInt(0, 10) > 5,
            isSubscribed: getRandomInt(0, 10) > 5,
            viewedAt: getRandomInt(0, 10) > 5 ? new Date() : undefined,
            rating: shouldRate ? getRandomInt(3, 5) : undefined,
          },
        });
      }

      for (const comicIssueId of comicIssueIds) {
        const shouldRate = getRandomInt(0, 10) > 7;
        await prisma.walletComicIssue.create({
          data: {
            walletAddress,
            comicIssueId,
            isFavourite: getRandomInt(0, 10) > 5,
            isSubscribed: getRandomInt(0, 10) > 5,
            viewedAt: getRandomInt(0, 10) > 5 ? new Date() : undefined,
            readAt: getRandomInt(0, 10) > 6 ? new Date() : undefined,
            rating: shouldRate ? getRandomInt(3, 5) : undefined,
          },
        });
      }

      i++;
    }

    console.log('➕ Added wallet-comic & wallet-comicIssue relations');
  } catch (e) {
    console.log(
      '❌ Failed to add dummy wallet-comic & wallet-comicIssue relations',
      e,
    );
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
