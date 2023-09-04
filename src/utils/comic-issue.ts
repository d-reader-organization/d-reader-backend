import { ComicRarity, StatefulCover, StatelessCover } from '@prisma/client';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { StatefulCoverDto } from '../comic-issue/dto/covers/stateful-cover.dto';
import { CreateComicIssueDto } from '../comic-issue/dto/create-comic-issue.dto';
import { PublishOnChainDto } from '../comic-issue/dto/publish-on-chain.dto';
import { UpdateComicIssueDto } from '../comic-issue/dto/update-comic-issue.dto';
import { BadRequestException } from '@nestjs/common';
import { MIN_SIGNATURES } from '../constants';

export const findDefaultCover = (statelessCovers: StatelessCover[]) => {
  return statelessCovers.find((cover) => cover.isDefault);
};

export const generateStatefulCoverName = (cover: StatefulCoverDto): string => {
  return (
    (cover.isUsed ? 'used-' : 'unused-') +
    (cover.isSigned ? 'signed' : 'unsigned') +
    (cover.rarity && cover.rarity != ComicRarity.None
      ? '-' + cover.rarity
      : '') +
    '-cover'
  );
};

export const validatePrice = (
  comicIssue: CreateComicIssueDto | UpdateComicIssueDto | PublishOnChainDto,
) => {
  // if supply is 0, it's a web2 comic which must be FREE
  if (
    (comicIssue.supply === 0 && comicIssue.mintPrice !== 0) ||
    (comicIssue.supply === 0 && comicIssue.discountMintPrice !== 0)
  ) {
    throw new BadRequestException('Offchain Comic issues must be free');
  }

  if (comicIssue.discountMintPrice > comicIssue.mintPrice) {
    throw new BadRequestException(
      'Discount mint price should be lower than base mint price',
    );
  } else if (comicIssue.discountMintPrice < 0 || comicIssue.mintPrice < 0) {
    throw new BadRequestException(
      'Mint prices must be greater than or equal to 0',
    );
  }
};

export const validateWeb3PublishInfo = (
  publishOnChainDto: PublishOnChainDto,
) => {
  if (publishOnChainDto.supply < 1) {
    throw new BadRequestException('Supply must be greater than 0');
  } else if (
    publishOnChainDto.sellerFee < 0 ||
    publishOnChainDto.sellerFee > 100
  ) {
    throw new BadRequestException('Seller fee must be in range of 0-100%');
  }
};

export const findCover = (covers: StatefulCover[], rarity: ComicRarity) => {
  return covers.find(
    (cover) => cover.rarity === rarity && !cover.isUsed && !cover.isSigned,
  );
};

export const validateComicIssueCMInput = (comicIssue: ComicIssueCMInput) => {
  if (comicIssue.supply < MIN_SIGNATURES) {
    throw new BadRequestException(
      `Cannot create an NFT collection with supply lower than ${MIN_SIGNATURES}`,
    );
  }

  if (comicIssue.discountMintPrice > comicIssue.mintPrice) {
    throw new BadRequestException(
      'Discount mint price should be lower than base mint price',
    );
  } else if (comicIssue.discountMintPrice < 0 || comicIssue.mintPrice < 0) {
    throw new BadRequestException(
      'Mint prices must be greater than or equal to 0',
    );
  }

  if (
    comicIssue.sellerFeeBasisPoints < 0 ||
    comicIssue.sellerFeeBasisPoints > 10000
  ) {
    throw new BadRequestException('Invalid seller fee value');
  }

  if (!comicIssue?.statelessCovers || !comicIssue?.statefulCovers) {
    throw new BadRequestException('Missing crucial cover assets');
  }

  const raritiesCount = comicIssue.statelessCovers.length;
  if (raritiesCount != 1 && raritiesCount != 3 && raritiesCount != 5) {
    throw new BadRequestException('Unsupported rarity count: ' + raritiesCount);
  }
};
