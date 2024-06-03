import { AudienceType, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';

export const gorecatsData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
  title: 'Gorecats',
  slug: 'gorecats',
  description:
    'Gorecats are an eclectic breed of treacherous little trouble makers, hell bent on using every single one of their glorious nine lives.',
  flavorText: 'by Emmy award winning duo Jim Bryson & Adam Jeffcoat',
  genres: {
    connect: [
      { slug: 'horror' },
      { slug: 'crime' },
      { slug: 'adventure' },
      { slug: 'sci-fi' },
    ],
  },
  audienceType: AudienceType.Mature,
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 9),
  popularizedAt: new Date(),
  cover: 'comics/gorecats/cover.jpg',
  logo: 'comics/gorecats/logo.png',
  website: 'https://gorecats.io',
  twitter: 'https://twitter.com/GORECATS',
  discord: 'https://discord.com/invite/gorecats',
  telegram: 'https://t.me/Gorecats',
  instagram: 'https://www.instagram.com/gorecats_art',
  s3BucketSlug: 'gorecats',
});

export const babiesData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 12),
  popularizedAt: new Date(),
  completedAt: new Date(),
  cover: 'comics/barbabyans/cover.jpg',
  logo: 'comics/barbabyans/logo.png',
  s3BucketSlug: 'barbabyans',
});

export const nikoData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 15),
  completedAt: new Date(),
  cover: 'comics/niko-and-the-sword/cover.jpg',
  banner: 'comics/niko-and-the-sword/banner.jpg',
  logo: 'comics/niko-and-the-sword/logo.png',
  website: 'https://www.artofniko.com/',
  twitter: 'https://twitter.com/StudioNX',
  instagram: 'https://www.instagram.com/jim_bryson/',
  youTube: 'https://www.youtube.com/channel/UCHGZaHM8q9aag4kXfZTq45w',
  s3BucketSlug: 'niko-and-the-sword',
});

export const portalData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  publishedAt: subDays(new Date(), 18),
  completedAt: new Date(),
  cover: 'comics/the-dark-portal/cover.jpg',
  logo: 'comics/the-dark-portal/logo.png',
  website: 'https://www.studionx.com/',
  twitter: 'https://twitter.com/StudioNX',
  instagram: 'https://www.instagram.com/jim_bryson/',
  youTube: 'https://www.youtube.com/channel/UCHGZaHM8q9aag4kXfZTq45w',
  s3BucketSlug: 'the-dark-portal',
});

export const lupersData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 17),
  popularizedAt: new Date(),
  cover: 'comics/lupers/cover.jpg',
  banner: 'comics/lupers/banner.jpg',
  logo: 'comics/lupers/logo.png',
  website: 'https://narentines.com',
  twitter: 'https://twitter.com/Narentines',
  discord: 'https://discord.com/invite/narentines',
  s3BucketSlug: 'lupers',
});

export const narentsData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 17),
  cover: 'comics/narentines/cover.jpg',
  banner: 'comics/narentines/banner.jpg',
  logo: 'comics/narentines/logo.png',
  website: 'https://narentines.com',
  twitter: 'https://twitter.com/Narentines',
  discord: 'https://discord.com/invite/narentines',
  s3BucketSlug: 'narentines',
});

export const heistData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 14),
  cover: 'comics/the-heist/cover.jpg',
  banner: 'comics/the-heist/banner.jpg',
  logo: 'comics/the-heist/logo.png',
  website: 'https://theheist.game/',
  twitter: 'https://twitter.com/playtheheist',
  discord: 'https://discord.com/invite/playtheheist',
  s3BucketSlug: 'the-heist',
});

export const gooneyData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
  title: 'Gooneytoons',
  slug: 'gooneytoons',
  description:
    "Some say this is a twisted nostalgia trip fuelled by too much LSD, or maybe it's that some men just want to see the world burn...",
  flavorText: '“Such nasty little creatures these Goons”',
  genres: {
    connect: [{ slug: 'action' }, { slug: 'adventure' }, { slug: 'sci-fi' }],
  },
  audienceType: AudienceType.Everyone,
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 14),
  cover: 'comics/gooneytoons/cover.jpg',
  banner: 'comics/gooneytoons/banner.png',
  logo: 'comics/gooneytoons/logo.png',
  website: 'https://gooneytoons.studio/',
  twitter: 'https://twitter.com/GooneyToonsNFT',
  discord: 'https://discord.com/invite/gooneytoons',
  instagram: 'https://www.instagram.com/gooneytoons.nft',
  s3BucketSlug: 'gooneytoons',
});

export const animoData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
  title: 'Animosities',
  slug: 'animosities',
  description: 'Short comic about love, anger, and treachery',
  flavorText: 'Prepare to get overwhelmed with hate and sorrow',
  genres: {
    connect: [{ slug: 'romance' }, { slug: 'action' }, { slug: 'fantasy' }],
  },
  audienceType: AudienceType.Mature,
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 13),
  completedAt: new Date(),
  cover: 'comics/animosities/cover.jpg',
  logo: 'comics/animosities/logo.png',
  s3BucketSlug: 'animosities',
});

export const birthData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
  title: 'Birthday',
  slug: 'birthday',
  description: 'A short comic that got published in KOMIKAZE #54 webzine',
  flavorText: '“So lovely” - my mom',
  genres: { connect: [{ slug: 'romance' }] },
  audienceType: AudienceType.Everyone,
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 19),
  completedAt: new Date(),
  cover: 'comics/birthday/cover.jpg',
  logo: 'comics/birthday/logo.png',
  s3BucketSlug: 'birthday',
});

export const taintData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
  title: 'Immaculate Taint',
  slug: 'immaculate-taint',
  description:
    'lady Kuga (the Plague) goes from village to village and likes being clean',
  flavorText: 'Death knocking at your door',
  genres: { connect: [{ slug: 'fantasy' }, { slug: 'horror' }] },
  audienceType: AudienceType.Everyone,
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 15),
  completedAt: new Date(),
  cover: 'comics/immaculate-taint/cover.jpg',
  logo: 'comics/immaculate-taint/logo.png',
  s3BucketSlug: 'immaculate-taint',
});

export const islandData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 16),
  completedAt: new Date(),
  cover: 'comics/island/cover.jpg',
  logo: 'comics/island/logo.png',
  s3BucketSlug: 'island',
});

export const wretchesData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 11),
  popularizedAt: new Date(),
  cover: 'comics/wretches/cover.jpg',
  logo: 'comics/wretches/logo.png',
  s3BucketSlug: 'wretches',
});

export const countyData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 15),
  cover: 'comics/knockturn-county/cover.jpg',
  logo: 'comics/knockturn-county/logo.png',
  s3BucketSlug: 'knockturn-county',
});

export const janaData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
  title: 'Jana',
  slug: 'jana',
  description:
    "Jana: And the Tower of Want is an all-ages fantasy story set in a world where its once magical land, and the wars fought over it, have become nothing more than myth for all but a young girl, who is forced to seek out an ancient tower's magic with the hope of bringing back the loved ones she had lost.",
  flavorText:
    'Two characters set out in search of a mythical tower in the hopes of reaching its peak',
  genres: { connect: [{ slug: 'adventure' }, { slug: 'fantasy' }] },
  audienceType: AudienceType.Everyone,
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 16),
  popularizedAt: new Date(),
  cover: 'comics/jana/cover.jpg',
  logo: 'comics/jana/logo.png',
  s3BucketSlug: 'jana',
});

export const watersData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
  title: 'Dark Waters',
  slug: 'dark-waters',
  description: `Intentionally or not, humans have literally turned our oceans into dumping grounds.
    There are issues facing our planet that, if we don\'t see them, if they\'re not affecting us directly, then, well, they\'re just not that important.`,
  flavorText:
    "A cautionary tale about the lengths we'd go to survive after losing everything we'd ever loved.",
  genres: { connect: [{ slug: 'non-fiction' }, { slug: 'crime' }] },
  audienceType: AudienceType.Everyone,
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 21),
  completedAt: new Date(),
  cover: 'comics/dark-waters/cover.jpg',
  logo: 'comics/dark-waters/logo.png',
  s3BucketSlug: 'dark-waters',
});

export const versusData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
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
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 10),
  popularizedAt: new Date(),
  completedAt: new Date(),
  cover: 'comics/multi-versus/cover.jpg',
  logo: 'comics/multi-versus/logo.png',
  s3BucketSlug: 'multi-versus',
});

export const tsukiData = (
  creatorId: number,
): Prisma.ComicCreateArgs['data'] => ({
  creatorId,
  title: 'Tsukiverse',
  slug: 'tsukiverse',
  description:
    'When a Tsukian reaches adolescence they must undergo a ritual by the tribal seer.',
  flavorText: 'Only the worthy shall be chosen!',
  genres: {
    connect: [{ slug: 'action' }, { slug: 'adventure' }, { slug: 'fantasy' }],
  },
  audienceType: AudienceType.Everyone,
  verifiedAt: new Date(),
  publishedAt: subDays(new Date(), 11),
  cover: 'comics/tsukiverse/cover.jpg',
  logo: 'comics/tsukiverse/logo.png',
  s3BucketSlug: 'tsukiverse',
});
