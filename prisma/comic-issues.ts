import { ComicRarity, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';

const generateCovers = (comicSlug: string, comicIssueSlug: string) => ({
  statefulCovers: {
    createMany: {
      data: [
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/unused-unsigned-cover.jpg`,
          isSigned: false,
          isUsed: false,
          rarity: ComicRarity.Common,
          artist: 'John Le',
        },
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/used-unsigned-cover.jpg`,
          isSigned: false,
          isUsed: true,
          rarity: ComicRarity.Common,
          artist: 'Laura El',
        },
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/unused-signed-cover.jpg`,
          isSigned: true,
          isUsed: false,
          rarity: ComicRarity.Common,
          artist: 'SCUM',
        },
        {
          image: `comics/${comicSlug}/issues/${comicIssueSlug}/used-signed-cover.jpg`,
          isSigned: true,
          isUsed: true,
          rarity: ComicRarity.Common,
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
          rarity: ComicRarity.Common,
          artist: 'John Le',
          share: 100,
          isDefault: true,
        },
      ],
    },
  },
});

const pages = (
  imagePath: string,
  numberOfPages: number,
  numberOfPreviewablePages = 3,
) => {
  const indexArray = [...Array(numberOfPages).keys()];

  const pages = indexArray.map((i) => {
    const pageNumber = i + 1;
    return {
      pageNumber,
      isPreviewable: pageNumber <= numberOfPreviewablePages,
      image: `${imagePath}/page-${pageNumber}.jpg`,
    };
  });

  return { createMany: { data: pages } };
};

export const gorecatsEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Rise of the Gorecats',
  slug: 'rise-of-the-gorecats',
  pdf: 'comics/gorecats/issues/rise-of-the-gorecats/rise-of-the-gorecats.pdf',
  description:
    'A sadistic breed of bloodthirsty critters wreak havoc across the city of catsburg. A washed up detective and his gung ho rookie are the only ones standing in the way of a full on invasion.',
  flavorText: 'Geez these cats are so gore',
  ...generateCovers('gorecats', 'rise-of-the-gorecats'),
  releaseDate: subDays(new Date(), 21),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/gorecats/issues/rise-of-the-gorecats/pages', 6, 6),
  isFreeToRead: false,
  isFullyUploaded: true,
  s3BucketSlug: 'rise-of-the-gorecats',
});

export const babiesEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Adventure Begins!',
  slug: 'adventure-begins',
  description:
    '3 chubby siblings embark on their first adventure. They discover a magical land and encounter various obstacles.',
  flavorText: '“Chubby babies are so cute” - grandma',
  ...generateCovers('barbabyans', 'adventure-begins'),
  releaseDate: subDays(new Date(), 23),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  popularizedAt: new Date(),
  pages: pages('comics/barbabyans/issues/adventure-begins/pages', 5, 5),
  isFreeToRead: false,
  isFullyUploaded: true,
  s3BucketSlug: 'adventure-begins',
});

export const nikoEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Many moons ago',
  slug: 'many-moons-ago',
  description:
    'His people gone. His kingdom a smouldering ruin. Follow the perilous adventures of Niko',
  flavorText: "“I'm just getting started!” - Niko",
  ...generateCovers('niko-and-the-sword', 'many-moons-ago'),
  releaseDate: subDays(new Date(), 17),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/niko-and-the-sword/issues/many-moons-ago/pages', 3, 3),
  isFreeToRead: false,
  isFullyUploaded: false,
  s3BucketSlug: 'many-moons-ago',
});

export const narentinesEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Narentines: The Purge',
  slug: 'narentines-the-purge',
  description:
    "Only but a few left remaining, as a new dawn rose and the Prophet noticed the signs. A new age would start for Narentines, as the great Purge pawes it's path to the Valley",
  flavorText:
    'The great stone is destroyed and sacrifise must be made to please the Mighty Abaia',
  ...generateCovers('narentines', 'narentines-the-purge'),
  releaseDate: subDays(new Date(), 17),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/narentines/issues/narentines-the-purge/pages', 1, 1),
  isFreeToRead: false,
  isFullyUploaded: false,
  s3BucketSlug: 'narentines-the-purge',
});

export const lupersEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Tome of Knowledge',
  slug: 'tome-of-knowledge',
  description:
    'The Lupers of Arx Urbis are a proud and noble race of wolves descended from the she-wolf of Lupercal, who raised Romulus and Remus',
  flavorText: 'Placeholder flavor text',
  ...generateCovers('lupers', 'tome-of-knowledge'),
  releaseDate: subDays(new Date(), 21),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  popularizedAt: new Date(),
  pages: pages('comics/lupers/issues/tome-of-knowledge/pages', 12, 12),
  isFreeToRead: false,
  isFullyUploaded: false,
  s3BucketSlug: 'tome-of-knowledge',
});

export const gooneyEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Birth of The Gooneys',
  slug: 'birth-of-the-gooneys',
  description:
    'In an underground lab located somewhere in the frigid tundra of Alaska, an unnamed and highly intoxicated scientist is on a quest to genetically engineer The Gooney Toons.',
  flavorText: '“Such nasty little creatures these Goons”',
  ...generateCovers('gooneytoons', 'birth-of-the-gooneys'),
  releaseDate: subDays(new Date(), 19),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/gooneytoons/issues/birth-of-the-gooneys/pages', 1, 1),
  isFreeToRead: true,
  isFullyUploaded: true,
  s3BucketSlug: 'birth-of-the-gooneys',
});

export const gooneyEp2Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 2,
  title: 'Carnage of The Gooneys',
  slug: 'carnage-of-the-gooneys',
  description:
    'For what is the purpose of creating 2 meter tall upright walking beast?',
  flavorText: '“Such nasty little creatures these Goons”',
  ...generateCovers('gooneytoons', 'carnage-of-the-gooneys'),
  releaseDate: subDays(new Date(), 18),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  isFreeToRead: false,
  isFullyUploaded: false,
  s3BucketSlug: 'carnage-of-the-gooneys',
});

export const gooneyEp3Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 3,
  title: 'Mutation of The Gooneys',
  slug: 'mutation-of-the-gooneys',
  description:
    'Some say this is a twisted nostalgia trip fuelled by too much LSD...',
  flavorText: '“Such nasty little creatures these Goons”',
  ...generateCovers('gooneytoons', 'mutation-of-the-gooneys'),
  releaseDate: subDays(new Date(), 17),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  isFreeToRead: false,
  isFullyUploaded: false,
  s3BucketSlug: 'mutation-of-the-gooneys',
});

export const gooneyEp4Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 4,
  title: 'Release of The Gooneys',
  slug: 'release-of-the-gooneys',
  description:
    'Some say this is a twisted nostalgia trip fuelled by too much LSD...',
  flavorText: '“Such nasty little creatures these Goons”',
  ...generateCovers('gooneytoons', 'release-of-the-gooneys'),
  releaseDate: subDays(new Date(), 16),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  isFreeToRead: false,
  isFullyUploaded: false,
  s3BucketSlug: 'release-of-the-gooneys',
});

export const animoEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Episode 1',
  slug: 'episode-1',
  description: 'Short comic about love, anger, and treachery',
  flavorText: 'Prepare to get overwhelmed with hate and sorrow',
  ...generateCovers('animosities', 'episode-1'),
  releaseDate: subDays(new Date(), 20),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/animosities/issues/episode-1/pages', 6, 6),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'episode-1',
});

export const taintEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Episode 1',
  slug: 'episode-1',
  description:
    'lady Kuga (the Plague) goes from village to village and likes being clean',
  ...generateCovers('immaculate-taint', 'episode-1'),
  releaseDate: subDays(new Date(), 19),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/immaculate-taint/issues/episode-1/pages', 8, 8),
  isFreeToRead: true,
  isFullyUploaded: true,
  s3BucketSlug: 'episode-1',
});

export const islandEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Episode 1',
  slug: 'episode-1',
  description: 'Summer vacation spent on the island of Susak',
  ...generateCovers('island', 'episode-1'),
  releaseDate: subDays(new Date(), 14),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  popularizedAt: new Date(),
  pages: pages('comics/island/issues/episode-1/pages', 11, 11),
  isFreeToRead: true,
  isFullyUploaded: true,
  s3BucketSlug: 'episode-1',
});

export const wretchesEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Issue 1',
  slug: 'issue-1',
  description:
    'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
  flavorText: 'This is a story about family. About loss.',
  ...generateCovers('wretches', 'issue-1'),
  releaseDate: subDays(new Date(), 22),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  popularizedAt: new Date(),
  pages: pages('comics/wretches/issues/issue-1/pages', 7, 7),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-1',
});

export const wretchesEp2Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 2,
  title: 'Issue 2',
  slug: 'issue-2',
  description:
    'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
  flavorText: 'This is a story about family. About loss.',
  ...generateCovers('wretches', 'issue-2'),
  releaseDate: subDays(new Date(), 19),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/wretches/issues/issue-2/pages', 6, 6),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-2',
});

export const wretchesEp3Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 3,
  title: 'Issue 3',
  slug: 'issue-3',
  description:
    'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
  flavorText: 'This is a story about family. About loss.',
  ...generateCovers('wretches', 'issue-3'),
  releaseDate: subDays(new Date(), 18),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/wretches/issues/issue-3/pages', 6, 6),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-3',
});

export const wretchesEp4Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 4,
  title: 'Issue 4',
  slug: 'issue-4',
  description:
    'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
  flavorText: 'This is a story about family. About loss.',
  ...generateCovers('wretches', 'issue-4'),
  releaseDate: subDays(new Date(), 16),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/wretches/issues/issue-4/pages', 5, 5),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-4',
});

export const wretchesEp5Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 5,
  title: 'Issue 5',
  slug: 'issue-5',
  description:
    'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
  flavorText: 'This is a story about family. About loss.',
  ...generateCovers('wretches', 'issue-5'),
  releaseDate: subDays(new Date(), 15),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/wretches/issues/issue-5/pages', 6, 6),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-5',
});

export const wretchesEp6Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 6,
  title: 'Issue 6',
  slug: 'issue-6',
  description:
    'Promotional purposes only. The completed graphic novel is available in the web2 space - Published by Scout Comics.',
  flavorText: 'This is a story about family. About loss.',
  ...generateCovers('wretches', 'issue-6'),
  releaseDate: subDays(new Date(), 12),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/wretches/issues/issue-6/pages', 5, 5),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-6',
});

export const janaEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Issue 1',
  slug: 'issue-1',
  description:
    "Jana: And the Tower of Want is an all-ages fantasy story set in a world where its once magical land, and the wars fought over it, have become nothing more than myth for all but a young girl, who is forced to seek out an ancient tower's magic with the hope of bringing back the loved ones she had lost.",
  flavorText:
    'Two characters set out in search of a mythical tower in the hopes of reaching its peak',
  ...generateCovers('jana', 'issue-1'),
  releaseDate: subDays(new Date(), 20),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  popularizedAt: new Date(),
  pages: pages('comics/jana/issues/issue-1/pages', 10, 10),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-1',
});

export const janaEp2Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 2,
  title: 'Issue 2',
  slug: 'issue-2',
  description:
    "Jana: And the Tower of Want is an all-ages fantasy story set in a world where its once magical land, and the wars fought over it, have become nothing more than myth for all but a young girl, who is forced to seek out an ancient tower's magic with the hope of bringing back the loved ones she had lost.",
  flavorText:
    'Two characters set out in search of a mythical tower in the hopes of reaching its peak',
  ...generateCovers('jana', 'issue-2'),
  releaseDate: subDays(new Date(), 19),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/jana/issues/issue-2/pages', 5, 5),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-2',
});

export const countyEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Issue 1',
  slug: 'issue-1',
  description:
    "It's Dr. Seuss meets Sin City.  Knockturn County is a gritty, adult crime noir set in a classic children's book universe. Various tales converge and collide in this county built on crime, as a rhyming narrative leads readers through a tangled web of death, booze, drugs, and betrayal. Good doesn't always win, bad doesn't always pay, and, in true noir fashion, people always die.",
  flavorText:
    '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
  ...generateCovers('knockturn-county', 'issue-1'),
  releaseDate: subDays(new Date(), 17),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/knockturn-county/issues/issue-1/pages', 14, 14),
  isFreeToRead: true,
  isFullyUploaded: true,
  s3BucketSlug: 'issue-1',
});

export const countyEp2Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 2,
  title: 'Issue 2',
  slug: 'issue-2',
  description:
    "It's Dr. Seuss meets Sin City.  Knockturn County is a gritty, adult crime noir set in a classic children's book universe. Various tales converge and collide in this county built on crime, as a rhyming narrative leads readers through a tangled web of death, booze, drugs, and betrayal. Good doesn't always win, bad doesn't always pay, and, in true noir fashion, people always die.",
  flavorText:
    '…A clever and dark comedic spin on classic rhyming storytelling. - IDW',
  ...generateCovers('knockturn-county', 'issue-2'),
  releaseDate: subDays(new Date(), 16),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/knockturn-county/issues/issue-2/pages', 5, 5),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'issue-2',
});

export const watersEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Treacherous Seas',
  slug: 'treacherous-seas',
  description: `Intentionally or not, humans have literally turned our oceans into dumping grounds.
There are issues facing our planet that, if we don\'t see them, if they\'re not affecting us directly, then, well, they\'re just not that important.`,
  flavorText:
    "A cautionary tale about the lengths we'd go to survive after losing everything we'd ever loved.",
  ...generateCovers('dark-waters', 'treacherous-seas'),
  releaseDate: subDays(new Date(), 21),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/dark-waters/issues/treacherous-seas/pages', 10, 10),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'treacherous-seas',
});

export const versusEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Episode 1',
  slug: 'episode-1',
  description:
    'A group of skilled warriors travel across parallel universes, battling powerful enemies and uncovering the mysteries of the multiverse.',
  flavorText: 'Amazing and inspiring story! - IDW',
  ...generateCovers('multi-versus', 'episode-1'),
  releaseDate: subDays(new Date(), 18),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  popularizedAt: new Date(),
  pages: pages('comics/multi-versus/issues/episode-1/pages', 5, 5),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'episode-1',
});

export const tsukiEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Issue 1',
  slug: 'issue-1',
  description:
    'When a Tsukian reaches adolescence they must undergo a ritual by the tribal seer.',
  flavorText: 'Only the worthy shall be chosen!',
  ...generateCovers('tsukiverse', 'issue-1'),
  releaseDate: subDays(new Date(), 22),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/tsukiverse/issues/issue-1/pages', 1, 1),
  isFreeToRead: true,
  isFullyUploaded: true,
  s3BucketSlug: 'issue-1',
});

export const portalEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Concept Art',
  slug: 'concept-art',
  description:
    ' A spirited Elf girl and a tearaway Frog Pirate embark on a magical quest to save their forest from invasion by a devious alien race known as the Mindbenders.',
  flavorText: 'Lovely pieces put by Jim Bryson',
  ...generateCovers('the-dark-portal', 'concept-art'),
  releaseDate: subDays(new Date(), 15),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  popularizedAt: new Date(),
  pages: pages('comics/the-dark-portal/issues/concept-art/pages', 9, 9),
  isFreeToRead: true,
  isFullyUploaded: false,
  s3BucketSlug: 'concept-art',
});

export const heistEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'How It All Began',
  slug: 'how-it-all-began',
  description:
    'A high-stakes, risk-based adventure of crime, corruption...and bananas.',
  flavorText: 'Bananas 🍌',
  ...generateCovers('the-heist', 'how-it-all-began'),
  releaseDate: subDays(new Date(), 14),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/the-heist/issues/how-it-all-began/pages', 1, 1),
  isFreeToRead: false,
  isFullyUploaded: false,
  s3BucketSlug: 'how-it-all-began',
});

export const birthEp1Data = (
  comicSlug: string,
): Prisma.ComicIssueCreateArgs['data'] => ({
  comicSlug,
  number: 1,
  title: 'Episode 1',
  slug: 'episode-1',
  description: 'A short comic that got published in KOMIKAZE #54 webzine',
  flavorText: '“So lovely” - my mom',
  ...generateCovers('birthday', 'episode-1'),
  releaseDate: subDays(new Date(), 16),
  verifiedAt: new Date(),
  publishedAt: new Date(),
  pages: pages('comics/birthday/issues/episode-1/pages', 4, 2),
  isFreeToRead: true,
  isFullyUploaded: true,
  s3BucketSlug: 'episode-1',
});

// Add missing comics, Chtulu, Geckos, Tensorians etc.?
