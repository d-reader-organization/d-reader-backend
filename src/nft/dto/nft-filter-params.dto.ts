import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Pagination } from '../../types/pagination.dto';

export class NftFilterParams extends PartialType(Pagination) {
  @IsOptional()
  @IsSolanaAddress()
  owner?: string;

  @IsOptional()
  @IsString()
  comicSlug?: string;

  @IsOptional()
  @IsString()
  comicIssueId?: string;
}
