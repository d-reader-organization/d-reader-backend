import {
  ComicIssue,
  ComicRarity,
  StatefulCover,
  StatelessCover,
} from '@prisma/client';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { StatefulCoverDto } from '../comic-issue/dto/covers/stateful-cover.dto';
import { PublishOnChainDto } from '../comic-issue/dto/publish-on-chain.dto';
import { StatelessCoverDto } from '../comic-issue/dto/covers/stateless-cover.dto';
import { CreateStatelessCoverBodyDto } from '../comic-issue/dto/covers/create-stateless-cover.dto';
import { CreateStatefulCoverBodyDto } from '../comic-issue/dto/covers/create-stateful-cover.dto';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';
import { isBasisPoints } from '../decorators/IsBasisPoints';
import { BadRequestException } from '@nestjs/common';

export const findDefaultCover = (statelessCovers: StatelessCover[]) => {
  return statelessCovers.find((cover) => cover.isDefault);
};

export const getStatelessCoverName = (
  cover: StatelessCoverDto | CreateStatelessCoverBodyDto,
): string => {
  return `cover${
    cover.rarity === ComicRarity.None ? '' : '-' + cover.rarity.toLowerCase()
  }`;
};

export const getStatefulCoverName = (
  cover: StatefulCoverDto | CreateStatefulCoverBodyDto,
): string => {
  const isUsedSubstring = cover.isUsed ? 'used-' : 'unused-';
  const isSignedSubstring = cover.isSigned ? 'signed' : 'unsigned';
  const raritySubstring =
    cover.rarity && cover.rarity != ComicRarity.None ? '-' + cover.rarity : '';
  const coverSuffix = '-cover';
  const coverFileName =
    isUsedSubstring + isSignedSubstring + raritySubstring + coverSuffix;
  const lowercasedName = coverFileName.toLowerCase();

  return lowercasedName;
};

export const validateWeb3PublishInfo = (
  publishOnChainDto: PublishOnChainDto,
) => {
  if (!isBasisPoints(publishOnChainDto.sellerFeeBasisPoints)) {
    throw new BadRequestException('Seller fee bps should be in range 0-10,000');
  } else if (!isSolanaAddress(publishOnChainDto.creatorAddress)) {
    throw new BadRequestException('Comic issue missing valid creator address');
  }
};

export const findCover = (covers: StatefulCover[], rarity: ComicRarity) => {
  return covers.find(
    (cover) => cover.rarity === rarity && !cover.isUsed && !cover.isSigned,
  );
};

export const validateComicIssueCMInput = (comicIssue: ComicIssueCMInput) => {
  if (!isBasisPoints(comicIssue.sellerFeeBasisPoints)) {
    throw new BadRequestException('Invalid seller fee value');
  }

  if (!comicIssue?.statelessCovers || !comicIssue?.statefulCovers) {
    throw new BadRequestException('Missing necessary cover assets');
  }

  const raritiesCount = comicIssue.statelessCovers.length;
  if (raritiesCount != 1 && raritiesCount != 3 && raritiesCount != 5) {
    throw new BadRequestException('Unsupported rarity count: ' + raritiesCount);
  }

  if (!isSolanaAddress(comicIssue.creatorAddress)) {
    throw new BadRequestException('Missing valid creator address');
  }

  if (!isSolanaAddress(comicIssue.creatorBackupAddress)) {
    throw new BadRequestException('Missing valid creator backup address');
  }
};

/** ComicIssue objects can be searched by a unique ID or by a combination of comic-slug_comic-issue-slug.
 * This function processes a string and checks if it can be converted to a number.
 *
 * If it can, it will be considered a unique ID number. If can't, it will be considered a unique comic + comic issue slug.
 *
 * For example:
 *
 * a) /get/100 -> return comic issue with ID 100
 *
 * b) /get/cyber-samurai_episode-1 -> return comic issue with slug "episode-1" and comic slug "cyber-samurai"
 *
 * IMPORTANT: this function respects the following naming convention: `comic-slug_comic-issue-slug`.
 *
 * Starting with a comic slug (kebab case), concated with underscore (snake case), and comic issue slug (kebab case)
 */
export const processComicIssueIdString = (
  uniqueIdentifier: string,
): Pick<ComicIssue, 'slug' | 'comicSlug'> | Pick<ComicIssue, 'id'> => {
  const isUniqueIdNumber = !isNaN(+uniqueIdentifier);

  if (isUniqueIdNumber) return { id: +uniqueIdentifier };
  else {
    const [comicSlug, slug] = uniqueIdentifier.split('_');

    return { slug, comicSlug };
  }
};
