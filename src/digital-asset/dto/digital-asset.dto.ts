import { isEmpty } from 'lodash';
import {
  CollectibleComicDto,
  toCollectibleComicDto,
  WithCollection,
  WithComicData,
  WithMetadata,
  WithStatefulCovers,
} from './collectible-comic.dto';
import {
  PrintEditionDto,
  toPrintEditionDto,
  WithPrintEditionDetails,
} from './print-edition.dto';
import { OneOfOneDto, toOneOfOneDto } from './one-of-one.dto';
import {
  CollectibleComic,
  DigitalAsset,
  DigitalAssetGenre,
  DigitalAssetTag,
  DigitalAssetTrait,
  OneOfOne,
} from '@prisma/client';

export type DigitalAssetDto =
  | CollectibleComicDto
  | PrintEditionDto
  | OneOfOneDto;

export type WithGenres = { genres: DigitalAssetGenre[] };
export type WithTags = { tags: DigitalAssetTag[] };
export type WithTraits = { traits: DigitalAssetTrait[] };

type WithCollectibleComic = {
  collectibleComic?: CollectibleComic &
    WithCollection &
    WithMetadata &
    WithStatefulCovers &
    WithComicData;
};
type WithPrintEdition = { printEdition?: WithPrintEditionDetails };
type WithOneOfOne = { oneOfOne?: OneOfOne };

export type DigitalAssetInput = DigitalAsset &
  WithCollectibleComic &
  WithOneOfOne &
  WithPrintEdition &
  WithGenres &
  WithTags &
  WithTraits;

export async function toDigitalAssetDto(input: DigitalAssetInput) {
  const isCollectibleComic = !isEmpty(input.collectibleComic);
  const isPrintEdition = !isEmpty(input.printEdition);

  if (isCollectibleComic) {
    const { collectibleComic, ...digitalAsset } = input;

    return toCollectibleComicDto({ ...collectibleComic, digitalAsset });
  } else if (isPrintEdition) {
    const { printEdition, genres, tags, traits, ...digitalAsset } = input;

    return toPrintEditionDto({
      ...printEdition,
      digitalAsset,
      genres,
      tags,
      traits,
    });
  } else {
    const { oneOfOne, genres, tags, traits, ...digitalAsset } = input;

    return toOneOfOneDto({ ...oneOfOne, digitalAsset, genres, tags, traits });
  }
}

export const toDigitalAssetDtoArray = (assets: DigitalAssetInput[]) => {
  return Promise.all(assets.map(toDigitalAssetDto));
};
