import { Prisma } from '@prisma/client';

export const genresToSeed: Prisma.GenreCreateManyArgs['data'] = [
  {
    name: 'Manga',
    slug: 'manga',
    priority: 1,
    icon: 'genres/manga.svg',
    color: '#e85a5b',
  },
  {
    name: 'Action',
    slug: 'action',
    priority: 2,
    icon: 'genres/action.svg',
    color: '#e9a860',
  },
  {
    name: 'Adventure',
    slug: 'adventure',
    priority: 3,
    icon: 'genres/adventure.svg',
    color: '#87c7e4',
  },
  {
    name: 'Romance',
    slug: 'romance',
    priority: 4,
    icon: 'genres/romance.svg',
    color: '#e37c8d',
  },
  {
    name: 'Non-fiction',
    slug: 'non-fiction',
    priority: 5,
    icon: 'genres/non-fiction.svg',
    color: '#8377f2',
  },
  {
    name: 'Comedy',
    slug: 'comedy',
    priority: 6,
    icon: 'genres/comedy.svg',
    color: '#49c187',
  },
  {
    name: 'Superhero',
    slug: 'superhero',
    priority: 7,
    icon: 'genres/superhero.svg',
    color: '#3926b4',
  },
  {
    name: 'Sci-fi',
    slug: 'sci-fi',
    priority: 8,
    icon: 'genres/sci-fi.svg',
    color: '#8200ea',
  },
  {
    name: 'Fantasy',
    slug: 'fantasy',
    priority: 9,
    icon: 'genres/fantasy.svg',
    color: '#c413e0',
  },
  {
    name: 'Drama',
    slug: 'drama',
    priority: 10,
    icon: 'genres/drama.svg',
    color: '#c5186b',
  },
  {
    name: 'History',
    slug: 'history',
    priority: 11,
    icon: 'genres/history.svg',
    color: '#764e4a',
  },
  {
    name: 'Horror',
    slug: 'horror',
    priority: 12,
    icon: 'genres/horror.svg',
    color: '#9c000e',
  },
  {
    name: 'Crime',
    slug: 'crime',
    priority: 13,
    icon: 'genres/crime.svg',
    color: '#3d3e60',
  },
  // {
  //   name: 'AI',
  //   slug: 'ai',
  //   priority: 14,
  //   icon: 'genres/ai.svg',
  //   color: '#ffffff',
  // },
];

export const digitalAssetGenresToSeed: Prisma.DigitalAssetGenreCreateManyArgs['data'] =
  [
    {
      name: 'Animation',
      slug: 'animation',
    },
    {
      name: 'Cover Art',
      slug: 'coverart',
    },
  ];
