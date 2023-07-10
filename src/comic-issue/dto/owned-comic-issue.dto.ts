import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsUrl, Min } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { ComicIssue, Nft, StatelessCover } from '@prisma/client';
import { findDefaultCover } from 'src/utils/comic-issue';
import { NftDto, toNftDto } from 'src/nft/dto/nft.dto';
import { PickType } from '@nestjs/swagger';

export class PartialNftDto extends PickType(NftDto, [
  'address',
  'attributes',
  'isUsed',
  'isSigned',
  'rarity',
]) {}

export class OwnedComicIssueDto {
  @IsPositive()
  id: number;

  @IsPositive()
  number: number;

  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsKebabCase()
  slug: string;

  @IsUrl()
  cover: string;

  @IsInt()
  @Min(0)
  ownedCopiesCount: number;

  @Type(() => PartialNftDto)
  ownedNft: PartialNftDto;
}

export type OwnedComicIssueInput = ComicIssue & {
  ownedCopiesCount: number;
  ownedNft: Nft;
  statelessCovers?: StatelessCover[];
};

export async function toOwnedComicIssueDto(issue: OwnedComicIssueInput) {
  const nftDto = await toNftDto(issue.ownedNft);
  const plainComicIssueDto: OwnedComicIssueDto = {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    slug: issue.slug,
    cover: getPublicUrl(findDefaultCover(issue.statelessCovers).image) || '',
    ownedCopiesCount: issue.ownedCopiesCount,
    ownedNft: {
      address: nftDto.address,
      attributes: nftDto.attributes,
      isUsed: nftDto.isUsed,
      isSigned: nftDto.isSigned,
      rarity: nftDto.rarity,
    },
  };

  const issueDto = plainToInstance(OwnedComicIssueDto, plainComicIssueDto);
  return issueDto;
}

export const toOwnedComicIssueDtoArray = (issues: OwnedComicIssueInput[]) => {
  return Promise.all(issues.map(toOwnedComicIssueDto));
};
