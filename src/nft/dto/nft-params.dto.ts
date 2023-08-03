import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Pagination } from '../../types/pagination.dto';

export class FilterParams extends PartialType(Pagination) {
  @IsOptional()
  @IsSolanaAddress()
  ownerAddress?: string;

  @IsOptional()
  @IsString()
  comicSlug?: string;

  @IsOptional()
  @IsString()
  comicIssueId?: string;
}
