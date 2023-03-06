import { PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { Pagination } from 'src/types/pagination.dto';

export class NftFilterParams extends PartialType(Pagination) {
  @IsOptional()
  @IsSolanaAddress()
  owner?: string;
}
