import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsPositive, IsString } from 'class-validator';
import { DraftComicIssueSalesData } from '@prisma/client';
import { IsBasisPoints } from 'src/decorators/IsBasisPoints';

export class DraftComicIssueSalesDataDto {
  @IsPositive()
  id: number;

  @IsPositive()
  comicIssueId: number;

  @IsString()
  revenueRange: string;

  @IsString()
  supplyRange: string;

  @IsString()
  launchDateRange: string;

  @IsString()
  currency: string;

  @IsBasisPoints()
  royaltyBasisPoint: number;

  @IsString()
  royaltyAddress: string;

  @IsString()
  note: string;

  @IsBoolean()
  isVerified: boolean;
}

export function toDraftComicIssueSalesDataDto(
  draftComicIssueSalesData: DraftComicIssueSalesData,
) {
  const plainDraftComicIssueSalesDataDto: DraftComicIssueSalesDataDto = {
    ...draftComicIssueSalesData,
    isVerified: !!draftComicIssueSalesData.verifiedAt,
  };

  const draftComicIssueSalesDataDto = plainToInstance(
    DraftComicIssueSalesDataDto,
    plainDraftComicIssueSalesDataDto,
  );
  return draftComicIssueSalesDataDto;
}
