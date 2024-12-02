import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';
import { IsNumberRange } from '../../decorators/IsNumberRange';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { divide } from 'lodash';

export class ComicIssueCollectibleInfoDto {
  @IsString()
  collectionAddress: string;

  @IsOptional()
  @IsString()
  activeCandyMachineAddress?: string;

  @IsNumberRange(0, 1)
  sellerFee: number;

  @IsOptional()
  @IsDate()
  startsAt?: Date;

  @IsBoolean()
  isSecondarySaleActive: boolean;

  @IsSolanaAddress()
  creatorAddress: string;
}

export type ComicIssueCollectibleInfoInput = {
  sellerFeeBasisPoints: number;
  collectionAddress: string;
  isSecondarySaleActive: boolean;
  creatorAddress: string;
  candyMachineAddress?: string;
  startsAt?: Date;
};

export function toComicIssueCollectibleInfoDto(
  issue: ComicIssueCollectibleInfoInput,
) {
  const plainComicIssueCollectibleInfoDto: ComicIssueCollectibleInfoDto = {
    sellerFee: divide(issue.sellerFeeBasisPoints, 100),
    isSecondarySaleActive: issue.isSecondarySaleActive,
    creatorAddress: issue.creatorAddress,
    collectionAddress: issue.collectionAddress,
    activeCandyMachineAddress: issue.candyMachineAddress,
    startsAt: issue.startsAt,
  };

  const comicIssueCollectibleInfoDto = plainToInstance(
    ComicIssueCollectibleInfoDto,
    plainComicIssueCollectibleInfoDto,
  );
  return comicIssueCollectibleInfoDto;
}
