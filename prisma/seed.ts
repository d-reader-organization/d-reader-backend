import { addDays, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { getRandomInt, sleep } from '../src/utils/helpers';
import {
  PrismaClient,
  Role,
  AudienceType,
  CarouselLocation,
  ComicRarity,
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
import { DarkblockService } from '../src/candy-machine/darkblock.service';

const generateCoversAndSignature = (
  comicSlug: string,
  comicIssueSlug: string,
) => ({
  signature: `comics/${comicSlug}/issues/${comicIssueSlug}/signature.png`,
  statefulCovers: {
    createMany: {
      data: [
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/unused-unsigned-cover.jpg`,
          isSigned: false,
          isUsed: false,
          rarity: ComicRarity.None,
          artist: 'John Le',
        },
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/used-unsigned-cover.jpg`,
          isSigned: false,
          isUsed: true,
          rarity: ComicRarity.None,
          artist: 'Laura El',
        },
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/unused-signed-cover.jpg`,
          isSigned: true,
          isUsed: false,
          rarity: ComicRarity.None,
          artist: 'SCUM',
        },
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/used-signed-cover.jpg`,
          isSigned: true,
          isUsed: true,
          rarity: ComicRarity.None,
          artist: 'Mate Žaja',
        },
      ],
    },
  },
  statelessCovers: {
    createMany: {
      data: [
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/cover.jpg`,
          rarity: ComicRarity.None,
          artist: 'John Le',
          share: 100,
          isDefault: true,
        },
      ],
    },
  },
});

const s3 = new s3Service();
const prisma = new PrismaClient();
const prismaService = new PrismaService();
const webSocketGateway = new WebSocketGateway();
const heliusService = new HeliusService(prismaService, webSocketGateway);
const comicPageService = new ComicPageService(s3, prismaService);
const darkblockService = new DarkblockService();
const candyMachineService = new CandyMachineService(
  prismaService,
  heliusService,
  darkblockService,
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
  await prisma.statefulCover.deleteMany();
  await prisma.statelessCover.deleteMany();
  await prisma.comicCollaborator.deleteMany();
  await prisma.comicIssueCollaborator.deleteMany();
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

  if (Boolean(process.env.SEED_S3)) {
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
          icon: 'genres/manga.svg',
          color: '#e85a5b',
        },
        {
          name: 'Action',
          slug: 'action',
          deletedAt: null,
          priority: 2,
          icon: 'genres/action.svg',
          color: '#e9a860',
        },
        {
          name: 'Adventure',
          slug: 'adventure',
          deletedAt: null,
          priority: 3,
          icon: 'genres/adventure.svg',
          color: '#87c7e4',
        },
        {
          name: 'Romance',
          slug: 'romance',
          deletedAt: null,
          priority: 4,
          icon: 'genres/romance.svg',
          color: '#e37c8d',
        },
        {
          name: 'Non-fiction',
          slug: 'non-fiction',
          deletedAt: null,
          priority: 5,
          icon: 'genres/non-fiction.svg',
          color: '#8377f2',
        },
        {
          name: 'Comedy',
          slug: 'comedy',
          deletedAt: null,
          priority: 6,
          icon: 'genres/comedy.svg',
          color: '#49c187',
        },
        {
          name: 'Superhero',
          slug: 'superhero',
          deletedAt: null,
          priority: 7,
          icon: 'genres/superhero.svg',
          color: '#3926b4',
        },
        {
          name: 'Sci-fi',
          slug: 'sci-fi',
          deletedAt: null,
          priority: 8,
          icon: 'genres/sci-fi.svg',
          color: '#8200ea',
        },
        {
          name: 'Fantasy',
          slug: 'fantasy',
          deletedAt: null,
          priority: 9,
          icon: 'genres/fantasy.svg',
          color: '#c413e0',
        },
        {
          name: 'Drama',
          slug: 'drama',
          deletedAt: null,
          priority: 10,
          icon: 'genres/drama.svg',
          color: '#c5186b',
        },
        {
          name: 'History',
          slug: 'history',
          deletedAt: null,
          priority: 11,
          icon: 'genres/history.svg',
          color: '#764e4a',
        },
        {
          name: 'Horror',
          slug: 'horror',
          deletedAt: null,
          priority: 12,
          icon: 'genres/horror.svg',
          color: '#9c000e',
        },
        {
          name: 'Crime',
          slug: 'crime',
          deletedAt: null,
          priority: 13,
          icon: 'genres/crime.svg',
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
        address: Keypair.generate().publicKey.toBase58(),
        name: 'deanslist',
        avatar: '',
        createdAt: new Date(),
        nonce: uuidv4(),
        role: Role.User,
        referralsRemaining: 30,
      },
    });
    console.log('➕ Added deanslist wallet');
  } catch (e) {
    console.log('❌ Failed to add deanslist wallet', e);
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
                title: 'Gorecats',
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
                popularizedAt: new Date(),
                completedAt: null,
                cover: 'comics/gorecats/cover.jpg',
                pfp: 'comics/gorecats/pfp.jpg',
                banner: '',
                logo: 'comics/gorecats/logo.png',
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
                    pdf: 'comics/gorecats/issues/rise-of-the-gorecats/rise-of-the-gorecats.pdf',
                    description:
                      'A sadistic breed of bloodthirsty critters wreak havoc across the city of catsburg. A washed up detective and his gung ho rookie are the only ones standing in the way of a full on invasion.',
                    flavorText: 'Geez these cats are so gore',
                    ...generateCoversAndSignature(
                      'gorecats',
                      'rise-of-the-gorecats',
                    ),
                    releaseDate: subDays(new Date(), 21),
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
                    pages: {
                      createMany: {
                        data: generatePages(
                          'comics/gorecats/issues/rise-of-the-gorecats/pages',
                          6,
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

    await prisma.comic.create({
      data: {
        creator: { connect: { slug: 'studio-nx' } },
        title: 'Barbabyans',
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
        popularizedAt: new Date(),
        completedAt: new Date(),
        cover: 'comics/barbabyans/cover.jpg',
        pfp: 'comics/barbabyans/pfp.jpg',
        banner: '',
        logo: 'comics/barbabyans/logo.png',
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
              ...generateCoversAndSignature('barbabyans', 'adventure-begins'),
              releaseDate: subDays(new Date(), 23),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/barbabyans/issues/adventure-begins/pages',
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
        title: 'Niko and the Sword',
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
        cover: 'comics/niko-and-the-sword/cover.jpg',
        pfp: 'comics/niko-and-the-sword/pfp.jpg',
        banner: 'comics/niko-and-the-sword/banner.jpg',
        logo: 'comics/niko-and-the-sword/logo.png',
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
            ...generateCoversAndSignature(
              'niko-and-the-sword',
              'many-moons-ago',
            ),
            releaseDate: subDays(new Date(), 17),
            deletedAt: null,
            featuredAt: null,
            verifiedAt: new Date(),
            publishedAt: new Date(),
            popularizedAt: null,
            pages: {
              createMany: {
                data: generatePages(
                  'comics/niko-and-the-sword/issues/many-moons-ago/pages',
                  3,
                  'jpg',
                  3,
                ),
              },
            },
          },
        },
      },
    });

    if (process.env.SOLANA_CLUSTER === 'devnet') {
      await prisma.comic.create({
        data: {
          creator: { connect: { slug: 'studio-nx' } },
          title: 'The Dark Portal',
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
          verifiedAt: null,
          publishedAt: subDays(new Date(), 18),
          popularizedAt: null,
          completedAt: new Date(),
          cover: 'comics/the-dark-portal/cover.jpg',
          pfp: 'comics/the-dark-portal/pfp.jpg',
          banner: '',
          logo: 'comics/the-dark-portal/logo.png',
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
              ...generateCoversAndSignature('the-dark-portal', 'concept-art'),
              releaseDate: subDays(new Date(), 15),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/the-dark-portal/issues/concept-art/pages',
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
    }

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
                title: 'Narentines',
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
                cover: 'comics/narentines/cover.jpg',
                pfp: 'comics/narentines/pfp.jpg',
                banner: 'comics/narentines/banner.jpg',
                logo: 'comics/narentines/logo.png',
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
                    ...generateCoversAndSignature(
                      'narentines',
                      'narentines-the-purge',
                    ),
                    releaseDate: subDays(new Date(), 17),
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
                    pages: {
                      createMany: {
                        data: generatePages(
                          'comics/narentines/issues/narentines-the-purge/pages',
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
        title: 'Lupers',
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
        popularizedAt: new Date(),
        completedAt: null,
        cover: 'comics/lupers/cover.jpg',
        pfp: 'comics/lupers/pfp.jpg',
        banner: 'comics/lupers/banner.jpg',
        logo: 'comics/lupers/logo.png',
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
              title: 'Tome of Knowledge',
              slug: 'tome-of-knowledge',
              description:
                'The Lupers of Arx Urbis are a proud and noble race of wolves descended from the she-wolf of Lupercal, who raised Romulus and Remus',
              flavorText: 'Placeholder flavor text',
              ...generateCoversAndSignature('lupers', 'tome-of-knowledge'),
              releaseDate: subDays(new Date(), 21),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/lupers/issues/tome-of-knowledge/pages',
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
              popularizedAt: new Date(),
              emailConfirmedAt: new Date(),
              comics: {
                create: {
                  title: 'The Heist',
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
                  cover: 'comics/the-heist/cover.jpg',
                  pfp: 'comics/the-heist/pfp.jpg',
                  banner: 'comics/the-heist/banner.jpg',
                  logo: 'comics/the-heist/logo.png',
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
                      ...generateCoversAndSignature(
                        'the-heist',
                        'how-it-all-began',
                      ),
                      releaseDate: subDays(new Date(), 14),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'comics/the-heist/issues/how-it-all-began/pages',
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
                title: 'Gooneytoons',
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
                cover: 'comics/gooneytoons/cover.jpg',
                pfp: 'comics/gooneytoons/pfp.jpg',
                banner: 'comics/gooneytoons/banner.png',
                logo: 'comics/gooneytoons/logo.png',
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
                      ...generateCoversAndSignature(
                        'gooneytoons',
                        'birth-of-the-gooneys',
                      ),
                      releaseDate: subDays(new Date(), 19),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'comics/gooneytoons/issues/birth-of-the-gooneys/pages',
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
                      ...generateCoversAndSignature(
                        'gooneytoons',
                        'carnage-of-the-gooneys',
                      ),
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
                      ...generateCoversAndSignature(
                        'gooneytoons',
                        'mutation-of-the-gooneys',
                      ),
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
                      ...generateCoversAndSignature(
                        'gooneytoons',
                        'release-of-the-gooneys',
                      ),
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
        avatar: '',
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
                title: 'Animosities',
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
                cover: 'comics/animosities/cover.jpg',
                pfp: 'comics/animosities/pfp.jpg',
                banner: '',
                logo: 'comics/animosities/logo.png',
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
                    ...generateCoversAndSignature('animosities', 'episode-1'),
                    releaseDate: subDays(new Date(), 20),
                    deletedAt: null,
                    featuredAt: null,
                    verifiedAt: new Date(),
                    publishedAt: new Date(),
                    popularizedAt: null,
                    pages: {
                      createMany: {
                        data: generatePages(
                          'comics/animosities/issues/episode-1/pages',
                          6,
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
          title: 'Birthday',
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
          cover: 'comics/birthday/cover.jpg',
          pfp: '',
          banner: '',
          logo: 'comics/birthday/logo.png',
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
                ...generateCoversAndSignature('birthday', 'episode-1'),
                releaseDate: subDays(new Date(), 16),
                deletedAt: null,
                featuredAt: null,
                verifiedAt: new Date(),
                publishedAt: new Date(),
                popularizedAt: null,
                pages: {
                  createMany: {
                    data: generatePages(
                      'comics/birthday/issues/episode-1/pages',
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
        title: 'Immaculate Taint',
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
        cover: 'comics/immaculate-taint/cover.jpg',
        pfp: 'comics/immaculate-taint/pfp.jpg',
        banner: '',
        logo: 'comics/immaculate-taint/logo.png',
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
              ...generateCoversAndSignature('immaculate-taint', 'episode-1'),
              releaseDate: subDays(new Date(), 19),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: null,
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/immaculate-taint/issues/episode-1/pages',
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
        title: 'Island',
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
        cover: 'comics/island/cover.jpg',
        pfp: 'comics/island/pfp.jpg',
        banner: '',
        logo: 'comics/island/logo.png',
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
              ...generateCoversAndSignature('island', 'episode-1'),
              releaseDate: subDays(new Date(), 14),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/island/issues/episode-1/pages',
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
              'A storytelling studio by Roach Writes, bringing worlds to life while crafting character driven stories in web3',
            flavorText: 'The muse pulls the strings. We are just her puppets.',
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
                title: 'Wretches',
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
                popularizedAt: new Date(),
                completedAt: null,
                cover: 'comics/wretches/cover.jpg',
                pfp: 'comics/wretches/pfp.jpg',
                banner: '',
                logo: 'comics/wretches/logo.png',
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
                        'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                      flavorText: 'This is a story about family. About loss.',
                      ...generateCoversAndSignature('wretches', 'issue-1'),
                      releaseDate: subDays(new Date(), 22),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: new Date(),
                      pages: {
                        createMany: {
                          data: generatePages(
                            'comics/wretches/issues/issue-1/pages',
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
                            'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          ...generateCoversAndSignature('wretches', 'issue-2'),
                          releaseDate: subDays(new Date(), 19),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'comics/wretches/issues/issue-2/pages',
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
                            'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          ...generateCoversAndSignature('wretches', 'issue-3'),
                          releaseDate: subDays(new Date(), 18),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'comics/wretches/issues/issue-3/pages',
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
                            'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          ...generateCoversAndSignature('wretches', 'issue-4'),
                          releaseDate: subDays(new Date(), 16),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'comics/wretches/issues/issue-4/pages',
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
                            'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          ...generateCoversAndSignature('wretches', 'issue-5'),
                          releaseDate: subDays(new Date(), 15),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'comics/wretches/issues/issue-5/pages',
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
                            'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
                          flavorText:
                            'This is a story about family. About loss.',
                          ...generateCoversAndSignature('wretches', 'issue-6'),
                          releaseDate: subDays(new Date(), 12),
                          deletedAt: null,
                          featuredAt: null,
                          verifiedAt: new Date(),
                          publishedAt: new Date(),
                          popularizedAt: null,
                          pages: {
                            createMany: {
                              data: generatePages(
                                'comics/wretches/issues/issue-6/pages',
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
        title: 'Jana',
        slug: 'jana',
        description:
          "Jana: And the Tower of Want is an all-ages fantasy story set in a world where its once magical land, and the wars fought over it, have become nothing more than myth for all but a young girl, who is forced to seek out an ancient tower's magic with the hope of bringing back the loved ones she had lost.",
        flavorText:
          'Two characters set out in search of a mythical tower in the hopes of reaching its peak',
        genres: {
          connect: [{ slug: 'adventure' }, { slug: 'fantasy' }],
        },
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 16),
        popularizedAt: new Date(),
        completedAt: null,
        cover: 'comics/jana/cover.jpg',
        pfp: 'comics/jana/pfp.jpg',
        banner: '',
        logo: 'comics/jana/logo.png',
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
                "Jana: And the Tower of Want is an all-ages fantasy story set in a world where its once magical land, and the wars fought over it, have become nothing more than myth for all but a young girl, who is forced to seek out an ancient tower's magic with the hope of bringing back the loved ones she had lost.",
              flavorText:
                'Two characters set out in search of a mythical tower in the hopes of reaching its peak',
              ...generateCoversAndSignature('jana', 'issue-1'),
              releaseDate: subDays(new Date(), 20),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/jana/issues/issue-1/pages',
                    10,
                    'jpg',
                    10,
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
                    "Jana: And the Tower of Want is an all-ages fantasy story set in a world where its once magical land, and the wars fought over it, have become nothing more than myth for all but a young girl, who is forced to seek out an ancient tower's magic with the hope of bringing back the loved ones she had lost.",
                  flavorText:
                    'Two characters set out in search of a mythical tower in the hopes of reaching its peak',
                  ...generateCoversAndSignature('jana', 'issue-2'),
                  releaseDate: subDays(new Date(), 19),
                  deletedAt: null,
                  featuredAt: null,
                  verifiedAt: new Date(),
                  publishedAt: new Date(),
                  popularizedAt: null,
                  pages: {
                    createMany: {
                      data: generatePages(
                        'comics/jana/issues/issue-2/pages',
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
        title: 'Knockturn County',
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
        cover: 'comics/knockturn-county/cover.jpg',
        pfp: 'comics/knockturn-county/pfp.jpg',
        banner: '',
        logo: 'comics/knockturn-county/logo.png',
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
                "It's Dr. Seuss meets Sin City.  Knockturn County is a gritty, adult crime noir set in a classic children's book universe. Various tales converge and collide in this county built on crime, as a rhyming narrative leads readers through a tangled web of death, booze, drugs, and betrayal. Good doesn't always win, bad doesn't always pay, and, in true noir fashion, people always die.",
              flavorText:
                '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
              ...generateCoversAndSignature('knockturn-county', 'issue-1'),
              releaseDate: subDays(new Date(), 17),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: null,
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/knockturn-county/issues/issue-1/pages',
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
                    "It's Dr. Seuss meets Sin City.  Knockturn County is a gritty, adult crime noir set in a classic children's book universe. Various tales converge and collide in this county built on crime, as a rhyming narrative leads readers through a tangled web of death, booze, drugs, and betrayal. Good doesn't always win, bad doesn't always pay, and, in true noir fashion, people always die.",
                  flavorText:
                    '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
                  ...generateCoversAndSignature('knockturn-county', 'issue-2'),
                  releaseDate: subDays(new Date(), 16),
                  deletedAt: null,
                  featuredAt: null,
                  verifiedAt: new Date(),
                  publishedAt: new Date(),
                  popularizedAt: null,
                  pages: {
                    createMany: {
                      data: generatePages(
                        'comics/knockturn-county/issues/issue-2/pages',
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
        title: 'Dark Waters',
        slug: 'dark-waters',
        description: `Intentionally or not, humans have literally turned our oceans into dumping grounds.
        There are issues facing our planet that, if we don\'t see them, if they\'re not affecting us directly, then, well, they\'re just not that important.`,
        flavorText:
          "A cautionary tale about the lengths we'd go to survive after losing everything we'd ever loved.",
        genres: {
          connect: [{ slug: 'non-fiction' }, { slug: 'crime' }],
        },
        audienceType: AudienceType.Everyone,
        deletedAt: null,
        featuredAt: null,
        verifiedAt: new Date(),
        publishedAt: subDays(new Date(), 21),
        popularizedAt: null,
        completedAt: new Date(),
        cover: 'comics/dark-waters/cover.jpg',
        pfp: 'comics/dark-waters/pfp.jpg',
        banner: '',
        logo: 'comics/dark-waters/logo.png',
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
              description: `Intentionally or not, humans have literally turned our oceans into dumping grounds.
        There are issues facing our planet that, if we don\'t see them, if they\'re not affecting us directly, then, well, they\'re just not that important.`,
              flavorText:
                "A cautionary tale about the lengths we'd go to survive after losing everything we'd ever loved.",
              ...generateCoversAndSignature('dark-waters', 'treacherous-seas'),
              releaseDate: subDays(new Date(), 21),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: null,
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/dark-waters/issues/treacherous-seas/pages',
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
        title: 'Multi-Versus',
        slug: 'multi-versus',
        description: `Intentionally or not, humans have literally turned our oceans into dumping grounds.
        There are issues facing our planet that, if we don\'t see them, if they\'re not affecting us directly, then, well, they\'re just not that important.`,
        flavorText:
          "A cautionary tale about the lengths we'd go to survive after losing everything we'd ever loved.",
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
        popularizedAt: new Date(),
        completedAt: new Date(),
        cover: 'comics/multi-versus/cover.jpg',
        pfp: '',
        banner: '',
        logo: 'comics/multi-versus/logo.png',
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
              ...generateCoversAndSignature('multi-versus', 'episode-1'),
              releaseDate: subDays(new Date(), 18),
              deletedAt: null,
              featuredAt: null,
              verifiedAt: new Date(),
              publishedAt: new Date(),
              popularizedAt: new Date(),
              pages: {
                createMany: {
                  data: generatePages(
                    'comics/multi-versus/issues/episode-1/pages',
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
            email: 'creators@dreader.io',
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
            popularizedAt: new Date(),
            emailConfirmedAt: new Date(),
            comics: {
              create: {
                title: 'Tsukiverse',
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
                cover: 'comics/tsukiverse/cover.jpg',
                pfp: 'comics/tsukiverse/pfp.jpg',
                banner: '',
                logo: 'comics/tsukiverse/logo.png',
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
                      ...generateCoversAndSignature('tsukiverse', 'issue-1'),
                      releaseDate: subDays(new Date(), 22),
                      deletedAt: null,
                      featuredAt: null,
                      verifiedAt: new Date(),
                      publishedAt: new Date(),
                      popularizedAt: null,
                      pages: {
                        createMany: {
                          data: generatePages(
                            'comics/tsukiverse/issues/issue-1/pages',
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

  const dummyWalletCount = 10;
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

      if (i % 20 === 0) {
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
        comicIssue.slug === 'tome-of-knowledge')
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
