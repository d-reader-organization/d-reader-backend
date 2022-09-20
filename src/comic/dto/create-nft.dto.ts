import { PickType } from '@nestjs/swagger';
import { NFTDto } from '../dto/nft.dto';

export class CreateNFTDto extends PickType(NFTDto, ['mint', 'comicIssueId']) {}
