import { PartialType } from '@nestjs/swagger';
import { Pagination } from 'src/types/pagination.dto';

export class NftFilterParams extends PartialType(Pagination) {}
