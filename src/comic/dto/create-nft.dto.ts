import { PickType } from '@nestjs/swagger';
import { NftDto } from '../dto/nft.dto';

export class CreateNftDto extends PickType(NftDto, ['mint', 'comicIssueId']) {}
