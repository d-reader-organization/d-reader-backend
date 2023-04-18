import { PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Pagination } from '../../types/pagination.dto';

export class NftFilterParams extends PartialType(Pagination) {
  @IsOptional()
  @IsSolanaAddress()
  owner?: string;
}
