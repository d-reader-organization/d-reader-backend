import { ComicRarity, StatefulCover, StatelessCover } from '@prisma/client';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { StatefulCoverDto } from '../comic-issue/dto/covers/stateful-cover.dto';
import { PublishOnChainDto } from '../comic-issue/dto/publish-on-chain.dto';
import { StatelessCoverDto } from '../comic-issue/dto/covers/stateless-cover.dto';
import { BadRequestException } from '@nestjs/common';
import { MIN_SIGNATURES } from '../constants';
import { CreateStatelessCoverBodyDto } from 'src/comic-issue/dto/covers/create-stateless-cover.dto';
import { CreateStatefulCoverBodyDto } from 'src/comic-issue/dto/covers/create-stateful-cover.dto';

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
  if (publishOnChainDto.supply < MIN_SIGNATURES) {
    throw new BadRequestException(
      `Cannot create an NFT collection with supply lower than ${MIN_SIGNATURES}`,
    );
  } else if (
    publishOnChainDto.sellerFee < 0 ||
    publishOnChainDto.sellerFee > 100
  ) {
    throw new BadRequestException('Seller fee must be in range of 0-100%');
  } else if (!publishOnChainDto.creatorAddress) {
    throw new BadRequestException('Comic issue missing creator address');
  } else if (publishOnChainDto.mintPrice < 0) {
    throw new BadRequestException(
      'Mint prices must be greater than or equal to 0',
    );
  }
};

export const findCover = (covers: StatefulCover[], rarity: ComicRarity) => {
  return covers.find(
    (cover) => cover.rarity === rarity && !cover.isUsed && !cover.isSigned,
  );
};

export const validateComicIssueCMInput = (comicIssue: ComicIssueCMInput) => {
  if (
    comicIssue.sellerFeeBasisPoints < 0 ||
    comicIssue.sellerFeeBasisPoints > 10000
  ) {
    throw new BadRequestException('Invalid seller fee value');
  }

  if (!comicIssue?.statelessCovers || !comicIssue?.statefulCovers) {
    throw new BadRequestException('Missing necessary cover assets');
  }

  const raritiesCount = comicIssue.statelessCovers.length;
  if (raritiesCount != 1 && raritiesCount != 3 && raritiesCount != 5) {
    throw new BadRequestException('Unsupported rarity count: ' + raritiesCount);
  }

  if (!comicIssue.creatorAddress) {
    throw new BadRequestException('Missing necessary creator address');
  }

  if (!comicIssue.creatorBackupAddress) {
    throw new BadRequestException('Missing necessary creator backup address');
  }

  if (!comicIssue.creatorBackupAddress) {
    throw new BadRequestException('Missing necessary creator backup address');
  }
};
