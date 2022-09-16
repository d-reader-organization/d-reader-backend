import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Collection } from './collection.entity';

export class NFT {
  @IsString()
  // TODO v1.1: @IsHash()
  @IsNotEmpty()
  mint: string;

  @IsString()
  collectionName: string;

  @IsOptional()
  @Type(() => Collection)
  collection: Collection;
}
