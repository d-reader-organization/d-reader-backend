import {
  CollectibleComic,
  CollectibleComicMetadata,
  DigitalAsset,
} from '@prisma/client';

export type TENSOR_ASSET = {
  onchainId: string;
  owner: string;
  listing: { seller: string; price: number; txId: string; source: string };
};

export type IndexCoreAssetReturnType = CollectibleComic & {
  digitalAsset: DigitalAsset & { owner: { userId: number } };
} & {
  metadata: CollectibleComicMetadata & { collection: { comicIssueId: number } };
} & { image: string };
