import { plainToInstance } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class ComicIssueCollectibleInfoDto {
  @IsString()
  collectionAddress: string;

  @IsOptional()
  @IsString()
  activeCandyMachineAddress?: string;

  @IsOptional()
  @IsDate()
  startsAt?: Date;
}

export type ComicIssueCollectibleInfoInput = {
  collectionAddress: string;
  candyMachineAddress?: string;
  startsAt?: Date;
};

export function toComicIssueCollectibleInfoDto(
  issue: ComicIssueCollectibleInfoInput,
) {
  const plainComicIssueCollectibleInfoDto: ComicIssueCollectibleInfoInput = {
    collectionAddress: issue.collectionAddress,
    candyMachineAddress: issue.candyMachineAddress,
    startsAt: issue.startsAt,
  };

  const comicIssueCollectibleInfoDto = plainToInstance(
    ComicIssueCollectibleInfoDto,
    plainComicIssueCollectibleInfoDto,
  );
  return comicIssueCollectibleInfoDto;
}
