import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Pagination } from '../../types/pagination.dto';

export class DigitalAssetFilterParams extends PartialType(Pagination) {
  @IsOptional()
  @IsSolanaAddress()
  ownerAddress?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  comicSlug?: string;

  @IsOptional()
  @IsString()
  comicIssueId?: string;

  @IsOptional()
  @IsString()
  collectionAddress?: string;
}
