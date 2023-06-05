import { addDays, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { getRandomInt, sleep } from '../src/utils/helpers';
import {
  PrismaClient,
  Role,
  AudienceType,
  CarouselLocation,
} from '@prisma/client';
import { CandyMachineService } from '../src/candy-machine/candy-machine.service';
import { HeliusService } from '../src/webhooks/helius/helius.service';
import { PrismaService } from 'nestjs-prisma';
import { WebSocketGateway } from '../src/websockets/websocket.gateway';
import { ComicIssueService } from '../src/comic-issue/comic-issue.service';
import { ComicPageService } from '../src/comic-page/comic-page.service';
import { WalletComicIssueService } from '../src/comic-issue/wallet-comic-issue.service';
import { s3Service } from '../src/aws/s3.service';
import { BundlrStorageDriver, sol } from '@metaplex-foundation/js';
import { initMetaplex } from '../src/utils/metaplex';

const s3 = new s3Service();
const prisma = new PrismaClient();
const prismaService = new PrismaService();
const webSocketGateway = new WebSocketGateway();
const heliusService = new HeliusService(prismaService, webSocketGateway);
const comicPageService = new ComicPageService(s3, prismaService);
const candyMachineService = new CandyMachineService(
  prismaService,
  heliusService,
);
const walletComicIssueService = new WalletComicIssueService(prismaService);
const comicIssueService = new ComicIssueService(
  s3,
  prismaService,
  comicPageService,
  candyMachineService,
  walletComicIssueService,
);
const seedBucket = process.env.AWS_SEED_BUCKET_NAME;
const metaplex = initMetaplex(heliusService.helius.endpoint);

const generatePages = (
  imagePath: string,
  numberOfPages: number,
  fileExtension: 'png' | 'jpg' | 'jpeg',
  numberOfPreviewablePages = 3,
) => {
  const indexArray = [...Array(numberOfPages).keys()];

  const pagesData = indexArray.map((i) => {
    const pageNumber = i + 1;
    return {
      pageNumber,
      isPreviewable: pageNumber <= numberOfPreviewablePages,
      image: `${imagePath}/page-${pageNumber}.${fileExtension}`,
    };
  });

  return pagesData;
};

async function main() {
  if (!process.env.WEBHOOK_ID) {
    throw new Error(
      'Webhook ID necessary in order to execute the seed command',
    );
  }

  console.log('⛏️ Emptying the database...');
  await prisma.listing.deleteMany();
  await prisma.candyMachineReceipt.deleteMany();
  await prisma.nft.deleteMany();
  await prisma.candyMachine.deleteMany();
  await prisma.collectionNft.deleteMany();
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
    console.log(`⛏️ Emptying '${s3.bucket}' s3 bucket...`);
    const keysToDelete = await s3.listFolderKeys({ Prefix: '' });
    await s3.deleteObjects(keysToDelete);
    console.log(`✅ Emptied '${s3.bucket}' s3 bucket!`);

    console.log(`⛏️ Cloning files from '${seedBucket}' bucket...`);

    const seedFileKeys = await s3.listFolderKeys({
      Bucket: seedBucket,
      Prefix: '',
    });

    for (const seedFileKey of seedFileKeys) {
      const copySource = `/${seedBucket}/${seedFileKey}`;
      await s3.copyObject({ CopySource: copySource, Key: seedFileKey });
      console.log(`🪧 Copied seed file from ${copySource}`);
    }
    console.log(`✅ Cloned files from '${seedBucket}' s3 bucket!`);
  }

  try {
    await prisma.carouselSlide.createMany({
      data: [
        {
          image: 'carousel/slides/1c4739b4-c402-459a-98ac-e884a6d51296.jpg',
          title: 'StudioNX - new creator',
          subtitle: 'Emmy award winning animation studio',
          priority: 1,
          comicIssueId: null,
          comicSlug: null,
          creatorSlug: 'studio-nx',
          externalLink: null,
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 90),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/deb35549-1f59-45db-9aef-2efc0ee5930a.jpg',
          title: 'Gooneytoons - new creator',
          subtitle: 'release: June 1st, 8am UTC',
          priority: 2,
          comicIssueId: null,
          comicSlug: 'gooneytoons',
          creatorSlug: null,
          externalLink: null,
          publishedAt: subDays(new Date(), 1),
          expiredAt: addDays(new Date(), 90),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/483d6796-e8ae-4379-80d4-4f9390fa3f1e.jpg',
          title: 'Tsukiverse',
          subtitle: 'In the land of might and magic...',
          priority: 3,
          comicIssueId: null,
          comicSlug: null,
          creatorSlug: 'goose-0-x',
          externalLink: null,
          publishedAt: new Date(),
          expiredAt: addDays(new Date(), 90),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/3368f69d-a2de-49ae-9001-45f508d029c5.jpg',
          title: 'Explore new worlds - Lupers',
          subtitle: 'release: July 14th, 10am UTC',
          priority: 4,
          comicIssueId: null,
          comicSlug: 'lupers',
          creatorSlug: null,
          externalLink: null,
          publishedAt: subDays(new Date(), 2),
          expiredAt: addDays(new Date(), 90),
          location: CarouselLocation.Home,
        },
        {
          image: 'carousel/slides/802ff196-544d-41d0-8d17-a1c1c353a317.jpg',
          title: 'The Narentines: Origin',
          subtitle: 'release: August 1st, 8am UTC',
          priority: 5,
          comicIssueId: null,
          comicSlug: 'narentines',
          creatorSlug: null,
          externalLink: null,
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

  const treasuryPubKey = metaplex.identity().publicKey;
  try {
    await prisma.wallet.create({
      data: {
        address: treasuryPubKey.toBase58(),
        name: 'Superadmin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Superadmin,
        referralsRemaining: process.env.SOLANA_CLUSTER === 'devnet' ? 10000 : 5,
      },
    });
    console.log('➕ Added Treasury wallet');
  } catch (e) {
    console.log('❌ Failed to add Treasury wallet', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: 'DXvYRNGBZmvEcefKSsNh7EcjEw1YgoiHaUtt2HLaX6yL',
        name: 'Saga',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        referralsRemaining: 20000,
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
        name: 'sa1',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Superadmin,
        referrer: {
          connect: { address: treasuryPubKey.toBase58() },
        },
        referredAt: new Date(Date.now()),
        referralsRemaining: process.env.SOLANA_CLUSTER === 'devnet' ? 10000 : 5,
      },
    });
    console.log('➕ Added Superadmin wallet');
  } catch (e) {
    console.log('❌ Failed to add Superadmin wallet', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: '4csmcoFjQgLWT6Lin1iSLMLCCHRck1UvkGY1VpsGGFSS',
        name: 'sa2',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Superadmin,
        referralsRemaining: process.env.SOLANA_CLUSTER === 'devnet' ? 10000 : 5,
      },
    });
    console.log('➕ Added s2 wallet');
  } catch (e) {
    console.log('❌ Failed to add s2 wallet', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: 'HyPFNtmwtSEjwPWch1a9juvZ9wERemXzDgtymGn2KUh7',
        name: 'alpha',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        referralsRemaining:
          process.env.SOLANA_CLUSTER === 'devnet' ? 10000 : 100,
      },
    });
    console.log('➕ Added alpha wallet');
  } catch (e) {
    console.log('❌ Failed to add alpha wallet', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: '75eLTqY6pfTGhuzXAtRaWYXW9DDPhmX5zStvCjDKDmZ9',
        name: 'Admin',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.Admin,
        referralsRemaining: process.env.SOLANA_CLUSTER === 'devnet' ? 10000 : 5,
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
        name: 'StudioNX',
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
            twitter: 'https://twitter.com/StudioNX',
            instagram: 'https://www.instagram.com/jim_bryson',
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
                audienceType: AudienceType.Mature,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 9),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/studio-nx/comics/gorecats/cover.jpg',
                pfp: 'creators/studio-nx/comics/gorecats/pfp.png',
                banner: '',
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
                    sellerFeeBasisPoints: 0,
                    title: 'Rise of the Gorecats',
                    slug: 'rise-of-the-gorecats',
                    description:
                      'A sadistic breed of bloodthirsty critters wreak havoc across the city of catsburg. A washed up detective and his gung ho rookie are the only ones standing in the way of a full on invasion.',
                    flavorText: 'Geez these cats are so gore',
                    cover:
                      'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/cover.png',
                    signedCover:
                      'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/signed-cover.png',
                    usedCover:
                      'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/used-cover.png',
                    usedSignedCover:
                      'creators/studio-nx/comics/gorecats/issues/rise-of-the-gorecats/used-signed-cover.png',
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
                          6,
                          'png',
                          6,
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
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 12),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/studio-nx/comics/barbabyans/cover.jpg',
        pfp: 'creators/studio-nx/comics/barbabyans/pfp.jpg',
        banner: '',
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
              sellerFeeBasisPoints: 0,
              title: 'Adventure Begins!',
              slug: 'adventure-begins',
              description:
                '3 chubby siblings embark on their first adventure. They discover a magical land and encounter various obstacles.',
              flavorText: '“Chubby babies are so cute” - grandma',
              cover:
                'creators/studio-nx/comics/barbabyans/issues/adventure-begins/cover.jpg',
              signedCover:
                'creators/studio-nx/comics/barbabyans/issues/adventure-begins/signed-cover.jpg',
              usedCover:
                'creators/studio-nx/comics/barbabyans/issues/adventure-begins/used-cover.jpg',
              usedSignedCover:
                'creators/studio-nx/comics/barbabyans/issues/adventure-begins/used-signed-cover.jpg',
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
                    5,
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
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 15),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/studio-nx/comics/niko-and-the-sword/cover.jpg',
        pfp: 'creators/studio-nx/comics/niko-and-the-sword/pfp.png',
        banner: 'creators/studio-nx/comics/niko-and-the-sword/banner.jpg',
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
            discountMintPrice: 0,
            mintPrice: 0,
            sellerFeeBasisPoints: 0,
            title: 'Many moons ago',
            slug: 'many-moons-ago',
            description:
              'His people gone. His kingdom a smouldering ruin. Follow the perilous adventures of Niko',
            flavorText: "“I'm just getting started!” - Niko",
            cover:
              'creators/studio-nx/comics/niko-and-the-sword/issues/many-moons-ago/cover.jpg',
            signedCover:
              'creators/studio-nx/comics/niko-and-the-sword/issues/many-moons-ago/signed-cover.jpg',
            usedCover:
              'creators/studio-nx/comics/niko-and-the-sword/issues/many-moons-ago/used-cover.jpg',
            usedSignedCover:
              'creators/studio-nx/comics/niko-and-the-sword/issues/many-moons-ago/used-signed-cover.jpg',
            releaseDate: subDays(new Date(), 17),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            publishedAt: new Date(),
            popularizedAt: new Date(),
            pages: {
              createMany: {
                data: generatePages(
                  'creators/studio-nx/comics/niko-and-the-sword/issues/many-moons-ago/pages',
                  3,
                  'png',
                  3,
                ),
              },
            },
          },
        },
      },
    });

    // if (process.env.SOLANA_CLUSTER === 'devnet') {
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
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 18),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/studio-nx/comics/the-dark-portal/cover.jpg',
        pfp: 'creators/studio-nx/comics/the-dark-portal/pfp.jpg',
        banner: '',
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
            discountMintPrice: 0,
            mintPrice: 0,
            sellerFeeBasisPoints: 0,
            title: 'Concept Art',
            slug: 'concept-art',
            description:
              ' A spirited Elf girl and a tearaway Frog Pirate embark on a magical quest to save their forest from invasion by a devious alien race known as the Mindbenders.',
            flavorText: 'Lovely pieces put by Jim Bryson',
            cover:
              'creators/studio-nx/comics/the-dark-portal/issues/concept-art/cover.png',
            signedCover:
              'creators/studio-nx/comics/the-dark-portal/issues/concept-art/signed-cover.png',
            usedCover:
              'creators/studio-nx/comics/the-dark-portal/issues/concept-art/used-cover.png',
            usedSignedCover:
              'creators/studio-nx/comics/the-dark-portal/issues/concept-art/used-signed-cover.png',
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
                  9,
                ),
              },
            },
          },
        },
      },
    });
    // }

    console.log('➕ Added "StudioNX" creator');
  } catch (e) {
    console.log('❌ Failed to add "StudioNX" creator', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: Keypair.generate().publicKey.toBase58(),
        name: 'Swamplabs',
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
            twitter: 'https://twitter.com/lupers_world',
            instagram: '',
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
                audienceType: AudienceType.Everyone,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 17),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/swamplabs/comics/narentines/cover.png',
                pfp: 'creators/swamplabs/comics/narentines/pfp.png',
                banner: 'creators/swamplabs/comics/narentines/banner.jpg',
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
                    sellerFeeBasisPoints: 0,
                    title: 'Narentines: The Purge',
                    slug: 'narentines-the-purge',
                    description:
                      "Only but a few left remaining, as a new dawn rose and the Prophet noticed the signs. A new age would start for Narentines, as the great Purge pawes it's path to the Valley",
                    flavorText:
                      'The great stone is destroyed and sacrifise must be made to please the Mighty Abaia',
                    cover:
                      'creators/swamplabs/comics/narentines/issues/narentines-the-purge/cover.png',
                    signedCover:
                      'creators/swamplabs/comics/narentines/issues/narentines-the-purge/signed-cover.png',
                    usedCover:
                      'creators/swamplabs/comics/narentines/issues/narentines-the-purge/used-cover.png',
                    usedSignedCover:
                      'creators/swamplabs/comics/narentines/issues/narentines-the-purge/used-signed-cover.png',
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
                          1,
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
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 17),
        popularizedAt: null,
        completedAt: null,
        cover: 'creators/swamplabs/comics/lupers/cover.jpg',
        pfp: 'creators/swamplabs/comics/lupers/pfp.jpg',
        banner: 'creators/swamplabs/comics/lupers/banner.jpg',
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
              discountMintPrice: 0,
              mintPrice: 0,
              sellerFeeBasisPoints: 0,
              title: 'Canis Lupers',
              slug: 'canis-lupers',
              description:
                'The Lupers of Arx Urbis are a proud and noble race of wolves descended from the she-wolf of Lupercal, who raised Romulus and Remus',
              flavorText: 'Placeholder flavor text',
              cover:
                'creators/swamplabs/comics/lupers/issues/canis-lupers/cover.jpg',
              signedCover:
                'creators/swamplabs/comics/lupers/issues/canis-lupers/signed-cover.jpg',
              usedCover:
                'creators/swamplabs/comics/lupers/issues/canis-lupers/used-cover.jpg',
              usedSignedCover:
                'creators/swamplabs/comics/lupers/issues/canis-lupers/used-signed-cover.jpg',
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
                    12,
                    'jpg',
                    12,
                  ),
                },
              },
            },
            {
              number: 2,
              supply: 0,
              discountMintPrice: 0,
              mintPrice: 0,
              sellerFeeBasisPoints: 0,
              title: 'Godiary: Ionus',
              slug: 'godiary-ionus',
              description:
                'Ionus is the god of sky and thunder. He is also the god of the city, order, and oaths.',
              flavorText: 'Placeholder flavor text',
              cover:
                'creators/swamplabs/comics/lupers/issues/godiary-ionus/cover.jpg',
              signedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-ionus/signed-cover.jpg',
              usedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-ionus/used-cover.jpg',
              usedSignedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-ionus/used-signed-cover.jpg',
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
                    12,
                    'jpg',
                    12,
                  ),
                },
              },
            },
            {
              number: 3,
              supply: 0,
              discountMintPrice: 0,
              mintPrice: 0,
              sellerFeeBasisPoints: 0,
              title: 'Godiary: Diluna',
              slug: 'godiary-diluna',
              description:
                'The most important deity is Diluna, the goddess of the hunt and the moon',
              flavorText: 'Placeholder flavor text',
              cover:
                'creators/swamplabs/comics/lupers/issues/godiary-diluna/cover.jpg',
              signedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-diluna/signed-cover.jpg',
              usedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-diluna/used-cover.jpg',
              usedSignedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-diluna/used-signed-cover.jpg',
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
                    12,
                    'jpg',
                    12,
                  ),
                },
              },
            },
            {
              number: 4,
              supply: 0,
              discountMintPrice: 0,
              mintPrice: 0,
              sellerFeeBasisPoints: 0,
              title: 'Godiary: Nuptus',
              slug: 'godiary-nuptus',
              description:
                'Nuptus is god of rivers, springs and waters. He is the patron of fishermen, and protector of rivers',
              flavorText: 'Placeholder flavor text',
              cover:
                'creators/swamplabs/comics/lupers/issues/godiary-nuptus/cover.jpg',
              signedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-nuptus/signed-cover.jpg',
              usedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-nuptus/used-cover.jpg',
              usedSignedCover:
                'creators/swamplabs/comics/lupers/issues/godiary-nuptus/used-signed-cover.jpg',
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
                    12,
                    'jpg',
                    12,
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

  if (process.env.SOLANA_CLUSTER === 'devnet') {
    try {
      await prisma.wallet.create({
        data: {
          address: Keypair.generate().publicKey.toBase58(),
          name: 'LL',
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
              website: 'https://linktr.ee/theheistgame',
              twitter: 'https://twitter.com/playtheheist',
              instagram: '',
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
                  audienceType: AudienceType.Everyone,
                  deletedAt: null,
                  featuredAt: null,
                  verifiedAt: new Date(),
                  publishedAt: subDays(new Date(), 14),
                  popularizedAt: null,
                  completedAt: null,
                  cover: 'creators/longwood-labs/comics/the-heist/cover.jpg',
                  pfp: 'creators/longwood-labs/comics/the-heist/pfp.jpg',
                  banner: 'creators/longwood-labs/comics/the-heist/banner.jpg',
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
                      sellerFeeBasisPoints: 0,
                      title: 'How It All Began',
                      slug: 'how-it-all-began',
                      description:
                        'A high-stakes, risk-based adventure of crime, corruption...and bananas.',
                      flavorText: 'Bananas 🍌',

                      cover:
                        'creators/longwood-labs/comics/the-heist/issues/how-it-all-began/cover.jpg',
                      signedCover:
                        'creators/longwood-labs/comics/the-heist/issues/how-it-all-began/signed-cover.jpg',
                      usedCover:
                        'creators/longwood-labs/comics/the-heist/issues/how-it-all-began/used-cover.jpg',
                      usedSignedCover:
                        'creators/longwood-labs/comics/the-heist/issues/how-it-all-began/used-signed-cover.jpg',
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
                            1,
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
          description:
            'A short comic that got published in KOMIKAZE #54 webzine',
          flavorText: '“No matter how many zombies, we keep resisting”',
          genres: {
            connect: [
              { slug: 'fantasy' },
              { slug: 'action' },
              { slug: 'romance' },
            ],
          },
          audienceType: AudienceType.Everyone,
          deletedAt: null,
          featuredAt: null,
          verifiedAt: new Date(),
          publishedAt: subDays(new Date(), 20),
          popularizedAt: null,
          completedAt: null,
          cover: 'creators/longwood-labs/comics/the-remnants/cover.png',
          pfp: 'creators/longwood-labs/comics/the-remnants/pfp.jpg',
          banner: '',
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
                discountMintPrice: 0,
                mintPrice: 0,
                sellerFeeBasisPoints: 0,
                title: 'All Alone',
                slug: 'all-alone',
                description:
                  'Matija finds himself knocked down & locked in the prison all alone.',
                flavorText: '“I wonder what I can do with these bolt cutters”',
                cover:
                  'creators/longwood-labs/comics/the-remnants/issues/all-alone/cover.png',
                signedCover:
                  'creators/longwood-labs/comics/the-remnants/issues/all-alone/signed-cover.png',
                usedCover:
                  'creators/longwood-labs/comics/the-remnants/issues/all-alone/used-cover.png',
                usedSignedCover:
                  'creators/longwood-labs/comics/the-remnants/issues/all-alone/used-signed-cover.png',
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
                      1,
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
  }

  try {
    await prisma.wallet.create({
      data: {
        address: Keypair.generate().publicKey.toBase58(),
        name: 'Gooneytoons',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
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
                flavorText: '“Such nasty little creatures these Goons”',
                genres: {
                  connect: [
                    { slug: 'action' },
                    { slug: 'adventure' },
                    { slug: 'sci-fi' },
                  ],
                },
                audienceType: AudienceType.Everyone,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 14),
                popularizedAt: null,
                completedAt: null,
                cover:
                  'creators/gooneytoons-studio/comics/gooneytoons/cover.png',
                pfp: 'creators/gooneytoons-studio/comics/gooneytoons/pfp.png',
                banner:
                  'creators/gooneytoons-studio/comics/gooneytoons/banner.png',
                logo: 'creators/gooneytoons-studio/comics/gooneytoons/logo.png',
                website: 'https://gooneytoons.studio/',
                twitter: 'https://twitter.com/GooneyToonsNFT',
                discord: 'https://discord.com/invite/gooneytoons',
                telegram: '',
                instagram: 'https://www.instagram.com/gooneytoons.nft',
                tikTok: '',
                youTube: '',
                issues: {
                  create: [
                    {
                      number: 1,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      sellerFeeBasisPoints: 0,
                      title: 'Birth of The Gooneys',
                      slug: 'birth-of-the-gooneys',
                      description:
                        'In an underground lab located somewhere in the frigid tundra of Alaska, an unnamed and highly intoxicated scientist is on a quest to genetically engineer The Gooney Toons.',
                      flavorText: '“Such nasty little creatures these Goons”',
                      cover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/birth-of-the-gooneys/cover.png',
                      signedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/birth-of-the-gooneys/signed-cover.png',
                      usedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/birth-of-the-gooneys/used-cover.png',
                      usedSignedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/birth-of-the-gooneys/used-signed-cover.png',
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
                            1,
                          ),
                        },
                      },
                    },
                    {
                      number: 2,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      sellerFeeBasisPoints: 0,
                      title: 'Carnage of The Gooneys',
                      slug: 'carnage-of-the-gooneys',
                      description:
                        'For what is the purpose of creating 2 meter tall upright walking beast?',
                      flavorText: '“Such nasty little creatures these Goons”',
                      cover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/carnage-of-the-gooneys/cover.jpg',
                      signedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/carnage-of-the-gooneys/signed-cover.jpg',
                      usedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/carnage-of-the-gooneys/used-cover.jpg',
                      usedSignedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/carnage-of-the-gooneys/used-signed-cover.jpg',
                      releaseDate: subDays(new Date(), 18),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                    },
                    {
                      number: 3,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      sellerFeeBasisPoints: 0,
                      title: 'Mutation of The Gooneys',
                      slug: 'mutation-of-the-gooneys',
                      description:
                        'Some say this is a twisted nostalgia trip fuelled by too much LSD...',
                      flavorText: '“Such nasty little creatures these Goons”',
                      cover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/mutation-of-the-gooneys/cover.jpg',
                      signedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/mutation-of-the-gooneys/signed-cover.jpg',
                      usedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/mutation-of-the-gooneys/used-cover.jpg',
                      usedSignedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/mutation-of-the-gooneys/used-signed-cover.jpg',
                      releaseDate: subDays(new Date(), 17),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                    },
                    {
                      number: 4,
                      supply: 0,
                      discountMintPrice: 0,
                      mintPrice: 0,
                      sellerFeeBasisPoints: 0,
                      title: 'Release of The Gooneys',
                      slug: 'release-of-the-gooneys',
                      description:
                        'Some say this is a twisted nostalgia trip fuelled by too much LSD...',
                      flavorText: '“Such nasty little creatures these Goons”',
                      cover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/release-of-the-gooneys/cover.jpg',
                      signedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/release-of-the-gooneys/signed-cover.jpg',
                      usedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/release-of-the-gooneys/used-cover.jpg',
                      usedSignedCover:
                        'creators/gooneytoons-studio/comics/gooneytoons/issues/release-of-the-gooneys/used-signed-cover.jpg',
                      releaseDate: subDays(new Date(), 16),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
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
        name: 'Saucerpen',
        avatar: 'creators/saucerpen/avatar.jpg',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
            email: 'korinahunjak@gmail.com',
            name: 'Saucerpen',
            slug: 'saucerpen',
            avatar: 'creators/saucerpen/avatar.jpg',
            banner: 'creators/saucerpen/banner.jpg',
            logo: 'creators/saucerpen/logo.png',
            description:
              'Hello! I am an illustrator, comic artist and graphic designer from Rijeka, Croatia',
            flavorText:
              '“Amazing artist & illustrator” - Croatian Academy of Fine Arts',
            website: 'https://korinahunjak.com/',
            twitter: '',
            instagram: 'https://www.instagram.com/korina.hunjak/',
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
                flavorText: 'Prepare to get overwhelmed with hate and sorrow',
                genres: {
                  connect: [
                    { slug: 'romance' },
                    { slug: 'action' },
                    { slug: 'fantasy' },
                  ],
                },
                audienceType: AudienceType.Mature,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 13),
                popularizedAt: null,
                completedAt: new Date(),
                cover: 'creators/saucerpen/comics/animosities/cover.jpeg',
                pfp: 'creators/saucerpen/comics/animosities/pfp.jpeg',
                banner: '',
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
                    sellerFeeBasisPoints: 0,
                    title: 'Episode 1',
                    slug: 'episode-1',
                    description: 'Short comic about love, anger, and treachery',
                    flavorText:
                      'Prepare to get overwhelmed with hate and sorrow',
                    cover:
                      'creators/saucerpen/comics/animosities/issues/episode-1/cover.jpeg',
                    signedCover:
                      'creators/saucerpen/comics/animosities/issues/episode-1/signed-cover.jpeg',
                    usedCover:
                      'creators/saucerpen/comics/animosities/issues/episode-1/used-cover.jpeg',
                    usedSignedCover:
                      'creators/saucerpen/comics/animosities/issues/episode-1/used-signed-cover.jpeg',
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
                          6, // TODO: change this (add remaining pages)
                          'jpg',
                          6,
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

    if (process.env.SOLANA_CLUSTER === 'devnet') {
      await prisma.comic.create({
        data: {
          creator: { connect: { slug: 'saucerpen' } },
          name: 'Birthday',
          slug: 'birthday',
          description:
            'A short comic that got published in KOMIKAZE #54 webzine',
          flavorText: '“So lovely” - my mom',
          genres: {
            connect: [{ slug: 'romance' }],
          },
          audienceType: AudienceType.Everyone,
          deletedAt: null,
          featuredAt: null,
          verifiedAt: new Date(),
          publishedAt: subDays(new Date(), 19),
          popularizedAt: null,
          completedAt: new Date(),
          cover: 'creators/saucerpen/comics/birthday/cover.jpg',
          pfp: '',
          banner: '',
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
                sellerFeeBasisPoints: 0,
                title: 'Episode 1',
                slug: 'episode-1',
                description:
                  'A short comic that got published in KOMIKAZE #54 webzine',
                flavorText: '“So lovely” - my mom',
                cover:
                  'creators/saucerpen/comics/birthday/issues/episode-1/cover.jpg',
                signedCover:
                  'creators/saucerpen/comics/birthday/issues/episode-1/signed-cover.jpg',
                usedCover:
                  'creators/saucerpen/comics/birthday/issues/episode-1/used-cover.jpg',
                usedSignedCover:
                  'creators/saucerpen/comics/birthday/issues/episode-1/used-signed-cover.jpg',
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
                      2,
                    ),
                  },
                },
              },
            ],
          },
        },
      });
    }

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'saucerpen' } },
        name: 'Immaculate Taint',
        slug: 'immaculate-taint',
        description:
          'lady Kuga (the Plague) goes from village to village and likes being clean',
        flavorText: 'Death knocking at your door',
        genres: {
          connect: [{ slug: 'fantasy' }, { slug: 'horror' }],
        },
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 15),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/saucerpen/comics/immaculate-taint/cover.jpg',
        pfp: 'creators/saucerpen/comics/immaculate-taint/pfp.jpg',
        banner: '',
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
              sellerFeeBasisPoints: 0,
              title: 'Episode 1',
              slug: 'episode-1',
              description:
                'lady Kuga (the Plague) goes from village to village and likes being clean',
              flavorText: '',
              cover:
                'creators/saucerpen/comics/immaculate-taint/issues/episode-1/cover.jpg',
              signedCover:
                'creators/saucerpen/comics/immaculate-taint/issues/episode-1/signed-cover.jpg',
              usedCover:
                'creators/saucerpen/comics/immaculate-taint/issues/episode-1/used-cover.jpg',
              usedSignedCover:
                'creators/saucerpen/comics/immaculate-taint/issues/episode-1/used-signed-cover.jpg',
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
                    8,
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
        flavorText: '🌊',
        genres: {
          connect: [
            { slug: 'romance' },
            { slug: 'adventure' },
            { slug: 'non-fiction' },
          ],
        },
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 16),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/saucerpen/comics/island/cover.jpg',
        pfp: 'creators/saucerpen/comics/island/pfp.jpg',
        banner: '',
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
              sellerFeeBasisPoints: 0,
              title: 'Episode 1',
              slug: 'episode-1',
              description: 'Summer vacation spent on the island of Susak',
              flavorText: '',
              cover:
                'creators/saucerpen/comics/island/issues/episode-1/cover.jpg',
              signedCover:
                'creators/saucerpen/comics/island/issues/episode-1/signed-cover.jpg',
              usedCover:
                'creators/saucerpen/comics/island/issues/episode-1/used-cover.jpg',
              usedSignedCover:
                'creators/saucerpen/comics/island/issues/episode-1/used-signed-cover.jpg',
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
                    11,
                  ),
                },
              },
            },
          ],
        },
      },
    });

    if (process.env.SOLANA_CLUSTER === 'devnet') {
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
          audienceType: AudienceType.Everyone,
          deletedAt: null,
          featuredAt: null,
          verifiedAt: new Date(),
          publishedAt: subDays(new Date(), 18),
          popularizedAt: null,
          completedAt: new Date(),
          cover: 'creators/saucerpen/comics/lamia/cover.jpg',
          pfp: 'creators/saucerpen/comics/lamia/pfp.jpg',
          banner: '',
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
                sellerFeeBasisPoints: 0,
                title: 'True Love',
                slug: 'true-love',
                description:
                  'Compositinal study of a preraphaelite painting "Lamia"',
                flavorText: '',
                cover:
                  'creators/saucerpen/comics/lamia/issues/true-love/cover.jpg',
                signedCover:
                  'creators/saucerpen/comics/lamia/issues/true-love/signed-cover.jpg',
                usedCover:
                  'creators/saucerpen/comics/lamia/issues/true-love/used-cover.jpg',
                usedSignedCover:
                  'creators/saucerpen/comics/lamia/issues/true-love/used-signed-cover.jpg',
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
                      1,
                    ),
                  },
                },
              },
            ],
          },
        },
      });
    }

    console.log('➕ Added "Saucerpen" creator');
  } catch (e) {
    console.log('❌ Failed to add "Saucerpen" creator', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: Keypair.generate().publicKey.toBase58(),
        name: 'Mad Muse Syndicate',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
            email: 'james.roche@dreader.io',
            name: 'Mad Muse Syndicate',
            slug: 'mad-muse-syndicate',
            avatar: 'creators/mad-muse-syndicate/avatar.jpg',
            banner: 'creators/mad-muse-syndicate/banner.jpg',
            logo: 'creators/mad-muse-syndicate/logo.jpg',
            description:
              'I host "Comic Book Writers on Writing" show, where I get to talk with other writers about everything from their creative process, to writing advise, the business side, crowdfunding, collaborating, and everything in between',
            flavorText: 'Not your standard storytellers',
            website: 'https://www.jameseroche.com',
            twitter: 'https://twitter.com/RoachWrites_',
            instagram: 'https://www.instagram.com/jameseroche',
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
                audienceType: AudienceType.Everyone,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 11),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/mad-muse-syndicate/comics/wretches/cover.jpg',
                pfp: 'creators/mad-muse-syndicate/comics/wretches/pfp.jpg',
                banner: '',
                logo: 'creators/mad-muse-syndicate/comics/wretches/logo.jpg',
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
                      sellerFeeBasisPoints: 0,
                      title: 'Issue 1',
                      slug: 'issue-1',
                      description:
                        'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                      flavorText: 'This is a story about family. About loss.',
                      cover:
                        'creators/mad-muse-syndicate/comics/wretches/issues/issue-1/cover.jpg',
                      signedCover:
                        'creators/mad-muse-syndicate/comics/wretches/issues/issue-1/signed-cover.jpg',
                      usedCover:
                        'creators/mad-muse-syndicate/comics/wretches/issues/issue-1/used-cover.jpg',
                      usedSignedCover:
                        'creators/mad-muse-syndicate/comics/wretches/issues/issue-1/used-signed-cover.jpg',
                      releaseDate: subDays(new Date(), 22),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-1/pages',
                            7,
                            'jpg',
                            7,
                          ),
                        },
                      },
                    },
                    process.env.SOLANA_CLUSTER === 'devnet'
                      ? {
                          number: 2,
                          supply: 0,
                          discountMintPrice: 0,
                          mintPrice: 0,
                          sellerFeeBasisPoints: 0,
                          title: 'Issue 2',
                          slug: 'issue-2',
                          description:
                            'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          cover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-2/cover.jpg',
                          signedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-2/signed-cover.jpg',
                          usedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-2/used-cover.jpg',
                          usedSignedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-2/used-signed-cover.jpg',
                          releaseDate: subDays(new Date(), 19),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'creators/mad-muse-syndicate/comics/wretches/issues/issue-2/pages',
                                6,
                                'jpg',
                                6,
                              ),
                            },
                          },
                        }
                      : undefined,
                    process.env.SOLANA_CLUSTER === 'devnet'
                      ? {
                          number: 3,
                          supply: 0,
                          discountMintPrice: 0,
                          mintPrice: 0,
                          sellerFeeBasisPoints: 0,
                          title: 'Issue 3',
                          slug: 'issue-3',
                          description:
                            'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          cover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-3/cover.jpg',
                          signedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-3/signed-cover.jpg',
                          usedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-3/used-cover.jpg',
                          usedSignedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-3/used-signed-cover.jpg',
                          releaseDate: subDays(new Date(), 18),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'creators/mad-muse-syndicate/comics/wretches/issues/issue-3/pages',
                                6,
                                'jpg',
                                6,
                              ),
                            },
                          },
                        }
                      : undefined,
                    process.env.SOLANA_CLUSTER === 'devnet'
                      ? {
                          number: 4,
                          supply: 0,
                          discountMintPrice: 0,
                          mintPrice: 0,
                          sellerFeeBasisPoints: 0,
                          title: 'Issue 4',
                          slug: 'issue-4',
                          description:
                            'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          cover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-4/cover.png',
                          signedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-4/signed-cover.png',
                          usedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-4/used-cover.png',
                          usedSignedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-4/used-signed-cover.png',
                          releaseDate: subDays(new Date(), 16),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'creators/mad-muse-syndicate/comics/wretches/issues/issue-4/pages',
                                5,
                                'jpg',
                                5,
                              ),
                            },
                          },
                        }
                      : undefined,
                    process.env.SOLANA_CLUSTER === 'devnet'
                      ? {
                          number: 5,
                          supply: 0,
                          discountMintPrice: 0,
                          mintPrice: 0,
                          sellerFeeBasisPoints: 0,
                          title: 'Issue 5',
                          slug: 'issue-5',
                          description:
                            'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          cover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-5/cover.jpg',
                          signedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-5/signed-cover.jpg',
                          usedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-5/used-cover.jpg',
                          usedSignedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-5/used-signed-cover.jpg',
                          releaseDate: subDays(new Date(), 15),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'creators/mad-muse-syndicate/comics/wretches/issues/issue-5/pages',
                                6,
                                'jpg',
                                6,
                              ),
                            },
                          },
                        }
                      : undefined,
                    process.env.SOLANA_CLUSTER === 'devnet'
                      ? {
                          number: 6,
                          supply: 0,
                          discountMintPrice: 0,
                          mintPrice: 0,
                          sellerFeeBasisPoints: 0,
                          title: 'Issue 6',
                          slug: 'issue-6',
                          description:
                            'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          cover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-6/cover.jpg',
                          signedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-6/signed-cover.jpg',
                          usedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-6/used-cover.jpg',
                          usedSignedCover:
                            'creators/mad-muse-syndicate/comics/wretches/issues/issue-6/used-signed-cover.jpg',
                          releaseDate: subDays(new Date(), 12),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'creators/mad-muse-syndicate/comics/wretches/issues/issue-6/pages',
                                5,
                                'jpg',
                                5,
                              ),
                            },
                          },
                        }
                      : undefined,
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
        creator: { connect: { slug: 'mad-muse-syndicate' } },
        name: 'Jana',
        slug: 'jana',
        description:
          'In a world where its once magical land, and the wars fought over it, have become nothing more than myth, a young girl is thrown into adventure and forced to seek out an ancient tower’s magic with the hope of bringing back the loved ones she had lost.',
        flavorText: 'PROMOTIONAL PURPOSES ONLY',
        genres: {
          connect: [
            { slug: 'romance' },
            { slug: 'adventure' },
            { slug: 'fantasy' },
          ],
        },
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 16),
        popularizedAt: null,
        completedAt: null,
        cover: 'creators/mad-muse-syndicate/comics/jana/cover.jpg',
        pfp: 'creators/mad-muse-syndicate/comics/jana/pfp.jpg',
        banner: '',
        logo: 'creators/mad-muse-syndicate/comics/jana/logo.jpg',
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
              sellerFeeBasisPoints: 0,
              title: 'Issue 1',
              slug: 'issue-1',
              description:
                'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
              flavorText: 'Jana and the tower of Want',
              cover:
                'creators/mad-muse-syndicate/comics/jana/issues/issue-1/cover.jpg',
              signedCover:
                'creators/mad-muse-syndicate/comics/jana/issues/issue-1/signed-cover.jpg',
              usedCover:
                'creators/mad-muse-syndicate/comics/jana/issues/issue-1/used-cover.jpg',
              usedSignedCover:
                'creators/mad-muse-syndicate/comics/jana/issues/issue-1/used-signed-cover.jpg',
              releaseDate: subDays(new Date(), 20),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/mad-muse-syndicate/comics/jana/issues/issue-1/pages',
                    5,
                    'jpg',
                    5,
                  ),
                },
              },
            },
            process.env.SOLANA_CLUSTER === 'devnet' && false
              ? {
                  number: 2,
                  supply: 0,
                  discountMintPrice: 0,
                  mintPrice: 0,
                  sellerFeeBasisPoints: 0,
                  title: 'Issue 2',
                  slug: 'issue-2',
                  description:
                    'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                  flavorText: 'Jana and the tower of Want',
                  cover:
                    'creators/mad-muse-syndicate/comics/jana/issues/issue-2/cover.jpg',
                  signedCover:
                    'creators/mad-muse-syndicate/comics/jana/issues/issue-2/signed-cover.jpg',
                  usedCover:
                    'creators/mad-muse-syndicate/comics/jana/issues/issue-2/used-cover.jpg',
                  usedSignedCover:
                    'creators/mad-muse-syndicate/comics/jana/issues/issue-2/used-signed-cover.jpg',
                  releaseDate: subDays(new Date(), 19),
                  deletedAt: null,
                  featuredAt: null,
                  verifiedAt: new Date(),
                  publishedAt: new Date(),
                  popularizedAt: new Date(),
                  pages: {
                    createMany: {
                      data: generatePages(
                        'creators/mad-muse-syndicate/comics/jana/issues/issue-2/pages',
                        5,
                        'jpg',
                        5,
                      ),
                    },
                  },
                }
              : undefined,
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'mad-muse-syndicate' } },
        name: 'Knockturn County',
        slug: 'knockturn-county',
        description:
          "It's Dr. Seuss meets Sin City.  Knockturn County is a gritty, adult crime noir set in a classic children's book universe. Various tales converge and collide in this county built on crime, as a rhyming narrative leads readers through a tangled web of death, booze, drugs, and betrayal. Good doesn't always win, bad doesn't always pay, and, in true noir fashion, people always die.",
        flavorText:
          "It's Dr. Seuss meets Sin City -- if Seuss was hopped up on whimsical-whiskey",
        genres: {
          connect: [
            { slug: 'comedy' },
            { slug: 'crime' },
            { slug: 'non-fiction' },
            { slug: 'adventure' },
          ],
        },
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 15),
        popularizedAt: null,
        completedAt: null,
        cover: 'creators/mad-muse-syndicate/comics/knockturn-county/cover.jpg',
        pfp: 'creators/mad-muse-syndicate/comics/knockturn-county/pfp.jpg',
        banner: '',
        logo: 'creators/mad-muse-syndicate/comics/knockturn-county/logo.jpg',
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
              sellerFeeBasisPoints: 0,
              title: 'Issue 1',
              slug: 'issue-1',
              description:
                'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
              flavorText:
                '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
              cover:
                'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-1/cover.jpg',
              signedCover:
                'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-1/signed-cover.jpg',
              usedCover:
                'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-1/used-cover.jpg',
              usedSignedCover:
                'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-1/used-signed-cover.jpg',
              releaseDate: subDays(new Date(), 17),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-1/pages',
                    14,
                    'jpg',
                    14,
                  ),
                },
              },
            },
            process.env.SOLANA_CLUSTER === 'devnet' && false
              ? {
                  number: 2,
                  supply: 0,
                  discountMintPrice: 0,
                  mintPrice: 0,
                  sellerFeeBasisPoints: 0,
                  title: 'Issue 2',
                  slug: 'issue-2',
                  description:
                    'PROMOTIONAL PURPOSES ONLY. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                  flavorText:
                    '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
                  cover:
                    'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-2/cover.jpg',
                  signedCover:
                    'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-2/signed-cover.jpg',
                  usedCover:
                    'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-2/used-cover.jpg',
                  usedSignedCover:
                    'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-2/used-signed-cover.jpg',
                  releaseDate: subDays(new Date(), 16),
                  deletedAt: null,
                  featuredAt: null,
                  verifiedAt: new Date(),
                  publishedAt: new Date(),
                  popularizedAt: new Date(),
                  pages: {
                    createMany: {
                      data: generatePages(
                        'creators/mad-muse-syndicate/comics/knockturn-county/issues/issue-2/pages',
                        5,
                        'jpg',
                        5,
                      ),
                    },
                  },
                }
              : undefined,
          ],
        },
      },
    });

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'mad-muse-syndicate' } },
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
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 21),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/mad-muse-syndicate/comics/dark-waters/cover.jpg',
        pfp: 'creators/mad-muse-syndicate/comics/dark-waters/pfp.jpg',
        banner: '',
        logo: 'creators/mad-muse-syndicate/comics/dark-waters/logo.jpg',
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
              sellerFeeBasisPoints: 0,
              title: 'Treacherous Seas',
              slug: 'treacherous-seas',
              description: 'Proceeds go to the Ronald McDonald House charity',
              flavorText: 'Amazing and inspiring story! - IDW',
              cover:
                'creators/mad-muse-syndicate/comics/dark-waters/issues/treacherous-seas/cover.jpg',
              signedCover:
                'creators/mad-muse-syndicate/comics/dark-waters/issues/treacherous-seas/signed-cover.jpg',
              usedCover:
                'creators/mad-muse-syndicate/comics/dark-waters/issues/treacherous-seas/used-cover.jpg',
              usedSignedCover:
                'creators/mad-muse-syndicate/comics/dark-waters/issues/treacherous-seas/used-signed-cover.jpg',
              releaseDate: subDays(new Date(), 21),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/mad-muse-syndicate/comics/dark-waters/issues/treacherous-seas/pages',
                    10,
                    'jpg',
                    10,
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
        creator: { connect: { slug: 'mad-muse-syndicate' } },
        name: 'Multi-Versus',
        slug: 'multi-versus',
        description:
          'A group of skilled warriors travel across parallel universes, battling powerful enemies and uncovering the mysteries of the multiverse.',
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
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 10),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'creators/mad-muse-syndicate/comics/multi-versus/cover.png',
        pfp: '',
        banner: '',
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
              sellerFeeBasisPoints: 0,
              title: 'Episode 1',
              slug: 'episode-1',
              description:
                'A group of skilled warriors travel across parallel universes, battling powerful enemies and uncovering the mysteries of the multiverse.',
              flavorText: 'Amazing and inspiring story! - IDW',
              cover:
                'creators/mad-muse-syndicate/comics/multi-versus/issues/episode-1/cover.png',
              signedCover:
                'creators/mad-muse-syndicate/comics/multi-versus/issues/episode-1/signed-cover.png',
              usedCover:
                'creators/mad-muse-syndicate/comics/multi-versus/issues/episode-1/used-cover.png',
              usedSignedCover:
                'creators/mad-muse-syndicate/comics/multi-versus/issues/episode-1/used-signed-cover.png',
              releaseDate: subDays(new Date(), 18),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'creators/mad-muse-syndicate/comics/multi-versus/issues/episode-1/pages',
                    5,
                    'png',
                    5,
                  ),
                },
              },
            },
          ],
        },
      },
    });

    console.log('➕ Added "Mad Muse Syndicate" creator');
  } catch (e) {
    console.log('❌ Failed to add "Mad Muse Syndicate" creator', e);
  }

  try {
    await prisma.wallet.create({
      data: {
        address: Keypair.generate().publicKey.toBase58(),
        name: 'Tsukiverse',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        creator: {
          create: {
            email: 'creators@dreader.io', // TODO: change this,
            name: 'Goose0x',
            slug: 'goose-0-x',
            avatar: 'creators/goose-0-x/avatar.jpg',
            banner: 'creators/goose-0-x/banner.jpg',
            logo: 'creators/goose-0-x/logo.png',
            description:
              'We are an Art first, story-driven project, with a unique nostalgic feel to make the collection and our brand stand out - all with your support as a loving community',
            flavorText:
              'brought to life by: @dangercloselabs | Artist and Lore @goose0x',
            website: 'https://www.tsukiverse.io',
            twitter: 'https://twitter.com/tsukiversenft',
            instagram: 'https://www.instagram.com/tsukiv3rse/',
            createdAt: new Date(),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            popularizedAt: null,
            emailConfirmedAt: new Date(),
            comics: {
              create: {
                name: 'Tsukiverse',
                slug: 'tsukiverse',
                description:
                  'When a Tsukian reaches adolescence they must undergo a ritual by the tribal seer.',
                flavorText: 'Only the worthy shall be chosen!',
                genres: {
                  connect: [
                    { slug: 'action' },
                    { slug: 'adventure' },
                    { slug: 'fantasy' },
                  ],
                },
                audienceType: AudienceType.Everyone,
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: subDays(new Date(), 11),
                popularizedAt: null,
                completedAt: null,
                cover: 'creators/goose-0-x/comics/tsukiverse/cover.jpg',
                pfp: 'creators/goose-0-x/comics/tsukiverse/pfp.jpg',
                banner: '',
                logo: 'creators/goose-0-x/comics/tsukiverse/logo.png',
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
                      sellerFeeBasisPoints: 0,
                      title: 'Issue 1',
                      slug: 'issue-1',
                      description:
                        'When a Tsukian reaches adolescence they must undergo a ritual by the tribal seer.',
                      flavorText: 'Only the worthy shall be chosen!',
                      cover:
                        'creators/goose-0-x/comics/tsukiverse/issues/issue-1/cover.jpg',
                      signedCover:
                        'creators/goose-0-x/comics/tsukiverse/issues/issue-1/signed-cover.jpg',
                      usedCover:
                        'creators/goose-0-x/comics/tsukiverse/issues/issue-1/used-cover.jpg',
                      usedSignedCover:
                        'creators/goose-0-x/comics/tsukiverse/issues/issue-1/used-signed-cover.jpg',
                      releaseDate: subDays(new Date(), 22),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'creators/goose-0-x/comics/tsukiverse/issues/issue-1/pages',
                            1,
                            'jpg',
                            1,
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

    console.log('➕ Added "Tsukiverse" creator');
  } catch (e) {
    console.log('❌ Failed to add "Tsukiverse" creator', e);
  }

  const dummyWalletCount =
    process.env.SOLANA_CLUSTER === 'mainnet-beta' ? 12 : 20;
  try {
    // dummy wallets
    const indexArray = [...Array(dummyWalletCount).keys()];
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
      await prisma.wallet.create({
        data: { address: walletAddress, name: `dummy-${i}` },
      });

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
        const shouldRate = getRandomInt(0, 10) > 5;
        await prisma.walletComic.create({
          data: {
            walletAddress,
            comicSlug,
            isFavourite: getRandomInt(0, 10) > 6,
            isSubscribed: getRandomInt(0, 10) > 3,
            viewedAt: getRandomInt(0, 10) > 6 ? new Date() : undefined,
            rating: shouldRate ? getRandomInt(4, 5) : undefined,
          },
        });
      }

      for (const comicIssueId of comicIssueIds) {
        const shouldRate = getRandomInt(0, 10) > 5;
        await prisma.walletComicIssue.create({
          data: {
            walletAddress,
            comicIssueId,
            isFavourite: getRandomInt(0, 10) > 6,
            isSubscribed: getRandomInt(0, 10) > 1,
            viewedAt: getRandomInt(0, 10) > 6 ? new Date() : undefined,
            readAt: getRandomInt(0, 10) > 6 ? new Date() : undefined,
            rating: shouldRate ? getRandomInt(4, 5) : undefined,
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

  await sleep(2000);

  const comicIssues = await prisma.comicIssue.findMany();
  const endpoint = clusterApiUrl('devnet');
  const solanaMetaplex = initMetaplex(endpoint);
  const storage = metaplex.storage().driver() as BundlrStorageDriver;

  if (process.env.SOLANA_CLUSTER !== 'mainnet-beta') {
    try {
      await solanaMetaplex.rpc().airdrop(treasuryPubKey, sol(2));
      console.log('Airdropped 2 sol');
    } catch (e) {
      console.log('Failed to airdrop 2 sol to the treasury wallet', e);
    }
  }

  let i = 1;
  for (const comicIssue of comicIssues) {
    if (process.env.SOLANA_CLUSTER !== 'mainnet-beta') {
      try {
        const balance = await (
          await storage.bundlr()
        ).getBalance(treasuryPubKey.toBase58());
        const solBalance = balance.toNumber() / LAMPORTS_PER_SOL;
        console.log('Bundlr balance: ', solBalance);
        if (solBalance < 0.3) {
          (await storage.bundlr()).fund(0.2 * LAMPORTS_PER_SOL);
          console.log('Funded bundlr storage');
        }
      } catch (e) {
        console.log('Failed to fund bundlr storage');
      }

      if (i % 10 === 0) {
        try {
          await solanaMetaplex.rpc().airdrop(treasuryPubKey, sol(2));
          console.log('Airdropped 2 sol');
        } catch (e) {
          console.log('Failed to airdrop 2 sol to the treasury wallet', e);
        }
      }
    }

    if (
      // skip publishing comics on mainnet-beta
      process.env.SOLANA_CLUSTER === 'mainnet-beta' ||
      (comicIssue.comicSlug === 'the-dark-portal' &&
        comicIssue.slug === 'concept-art') ||
      (comicIssue.comicSlug === 'knockturn-county' &&
        comicIssue.slug === 'issue-2') ||
      comicIssue.comicSlug === 'wretches' ||
      (comicIssue.comicSlug === 'lupers' &&
        comicIssue.slug === 'godiary-nuptus')
    ) {
      console.log('Skipping comic issue ', comicIssue.id);
      continue;
    } else {
      console.log(i, ' ➕ Publishing comic issue ' + comicIssue.id);

      await comicIssueService.publishOnChain(comicIssue.id, {
        supply: getRandomInt(1, 4) * 10, // 10-40 supply
        mintPrice: getRandomInt(1, 2) * 0.1 * LAMPORTS_PER_SOL, // 0.1-0.2 price
        discountMintPrice: 0.05 * LAMPORTS_PER_SOL, // 0.05 discount price
        sellerFee: 5, // 5%
      });
      i++;
    }
  }

  console.log(
    "⚠️ Please make sure to run 'yarn sync-webhook' command in order to set Helius webhooks correctly",
  );
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
