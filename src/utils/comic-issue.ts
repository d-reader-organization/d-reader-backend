import { ComicRarity, StatefulCover, StatelessCover } from '@prisma/client';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { StatefulCoverDto } from '../comic-issue/dto/covers/stateful-cover.dto';
import { PublishOnChainDto } from '../comic-issue/dto/publish-on-chain.dto';
import { StatelessCoverDto } from '../comic-issue/dto/covers/stateless-cover.dto';
import { CreateStatelessCoverBodyDto } from '../comic-issue/dto/covers/create-stateless-cover.dto';
import { CreateStatefulCoverBodyDto } from '../comic-issue/dto/covers/create-stateful-cover.dto';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';
import { isBasisPoints } from '../decorators/IsBasisPoints';
import { BadRequestException } from '@nestjs/common';
import { min } from 'class-validator';

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
  return (
    (cover.isUsed ? 'used-' : 'unused-') +
    (cover.isSigned ? 'signed' : 'unsigned') +
    (cover.rarity && cover.rarity != ComicRarity.None
      ? '-' + cover.rarity
      : '') +
    '-cover'
  );
};

export const validateWeb3PublishInfo = (
  publishOnChainDto: PublishOnChainDto,
) => {
  if (isBasisPoints(publishOnChainDto.sellerFeeBasisPoints)) {
    throw new BadRequestException('Seller fee bps should be in range 0-10,000');
  } else if (!isSolanaAddress(publishOnChainDto.creatorAddress)) {
    throw new BadRequestException('Comic issue missing valid creator address');
  } else if (min(publishOnChainDto.mintPrice, 0)) {
    throw new BadRequestException('Price must be greater than or equal to 0');
  }
};

export const findCover = (covers: StatefulCover[], rarity: ComicRarity) => {
  return covers.find(
    (cover) => cover.rarity === rarity && !cover.isUsed && !cover.isSigned,
  );
};

export const validateComicIssueCMInput = (comicIssue: ComicIssueCMInput) => {
  if (isBasisPoints(comicIssue.sellerFeeBasisPoints)) {
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
