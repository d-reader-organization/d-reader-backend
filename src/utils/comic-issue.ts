import { ComicRarity, StatelessCover } from '@prisma/client';
import { RarityShare } from '../comic-issue/dto/types';
import { THREE_RARITIES_SHARE, FIVE_RARITIES_SHARE } from '../constants';
import { StatefulCoverDto } from 'src/comic-issue/dto/covers/stateful-cover.dto';

export const getRarityShare = (numberOfCovers: number, rarity: ComicRarity) => {
  let rarityShare: RarityShare[];
  if (numberOfCovers === 3) rarityShare = THREE_RARITIES_SHARE;
  else if (numberOfCovers === 5) rarityShare = FIVE_RARITIES_SHARE;
  else {
    throw new Error('Unsupported number of rarities');
  }

  return rarityShare.find((share) => share.rarity === rarity).value;
};

export const findDefaultCover = (statelessCovers: StatelessCover[]) => {
  return statelessCovers.find((cover) => cover.isDefault);
};

// TODO: use this function when adding covers to the database
export const generateStatefulCoverName = (
  cover: StatefulCoverDto,
  haveRarity: boolean,
): string => {
  return (
    (cover.isUsed ? 'used-' : 'unused-') +
    (cover.isSigned ? 'signed' : 'unsigned') +
    (haveRarity ? '-' + cover.rarity : '') +
    '-cover'
  );
};
