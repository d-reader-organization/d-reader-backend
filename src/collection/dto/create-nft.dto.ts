import { PickType } from '@nestjs/swagger';
import { NFT } from '../entities/nft.entity';

export class CreateNFTDto extends PickType(NFT, ['mint', 'collectionName']) {}
