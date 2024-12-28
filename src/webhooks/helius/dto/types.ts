import {
  CollectibleComic,
  CollectibleComicMetadata,
  DigitalAsset,
} from '@prisma/client';

export type IndexCoreAssetReturnType = CollectibleComic & {
  digitalAsset: DigitalAsset & { owner: { userId: number } };
} & {
  metadata: CollectibleComicMetadata & { collection: { comicIssueId: number } };
} & { image: string };
