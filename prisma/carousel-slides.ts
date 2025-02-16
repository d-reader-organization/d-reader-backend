import { CarouselLocation, Prisma } from '@prisma/client';
import { addDays, subDays } from 'date-fns';

export const carouselSlidesToSeed: Prisma.CarouselSlideCreateManyArgs['data'] =
  [
    {
      image: 'carousel/slides/1c4739b4-c402-459a-98ac-e884a6d51296.jpg',
      title: 'StudioNX - new creator',
      subtitle: 'Emmy award winning animation studio',
      priority: 1,
      comicIssueId: null,
      comicSlug: null,
      creatorHandle: 'studio-nx',
      externalLink: null,
      publishedAt: new Date(),
      expiredAt: addDays(new Date(), 90),
      location: CarouselLocation.HomePrimary,
    },
    {
      image: 'carousel/slides/deb35549-1f59-45db-9aef-2efc0ee5930a.jpg',
      title: 'Gooneytoons - new creator',
      subtitle: 'release: coming soon',
      priority: 2,
      comicIssueId: null,
      comicSlug: 'gooneytoons',
      creatorHandle: null,
      externalLink: null,
      publishedAt: subDays(new Date(), 1),
      expiredAt: addDays(new Date(), 90),
      location: CarouselLocation.HomePrimary,
    },
    {
      image: 'carousel/slides/483d6796-e8ae-4379-80d4-4f9390fa3f1e.jpg',
      title: 'Tsukiverse',
      subtitle: 'In the land of might and magic...',
      priority: 3,
      comicIssueId: null,
      comicSlug: null,
      creatorHandle: 'goose-0-x',
      externalLink: null,
      publishedAt: new Date(),
      expiredAt: addDays(new Date(), 90),
      location: CarouselLocation.HomePrimary,
    },
    {
      image: 'carousel/slides/3368f69d-a2de-49ae-9001-45f508d029c5.jpg',
      title: 'Explore new worlds - Lupers',
      subtitle: 'release: coming soon',
      priority: 4,
      comicIssueId: null,
      comicSlug: 'lupers',
      creatorHandle: null,
      externalLink: null,
      publishedAt: subDays(new Date(), 2),
      expiredAt: addDays(new Date(), 90),
      location: CarouselLocation.HomePrimary,
    },
    {
      image: 'carousel/slides/802ff196-544d-41d0-8d17-a1c1c353a317.jpg',
      title: 'The Narentines: Origin',
      subtitle: 'release: coming soon',
      priority: 5,
      comicIssueId: null,
      comicSlug: 'narentines',
      creatorHandle: null,
      externalLink: null,
      publishedAt: new Date(),
      expiredAt: addDays(new Date(), 90),
      location: CarouselLocation.HomePrimary,
    },
  ];
