import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsBasisPoints } from 'src/decorators/IsBasisPoints';

export class CreateDraftComicIssueSalesDataDto {
  @IsInt()
  comicIssueId: number;

  @IsNotEmpty()
  @IsString()
  revenueRange: string;

  @IsNotEmpty()
  @IsString()
  supplyRange: string;

  @IsOptional()
  @IsString()
  launchDateRange?: string;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsBasisPoints()
  royaltyBasisPoint?: number;

  @IsNotEmpty()
  @IsString()
  royaltyAddress: string;

  @IsOptional()
  @IsString()
  note?: string;
}
