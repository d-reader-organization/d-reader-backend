import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { NftService } from './nft.service';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NftDto, toNftDto, toNftDtoArray } from './dto/nft.dto';
import { NftFilterParams } from './dto/nft-filter-params.dto';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('NFTs')
@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  /* Get all NFTs */
  @Get('get')
  async findAll(@Query() query: NftFilterParams): Promise<NftDto[]> {
    const nfts = await this.nftService.findAll(query);
    return await toNftDtoArray(nfts);
  }

  /* Get specific NFT by unique on-chain address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<NftDto> {
    const nft = await this.nftService.findOne(address);
    return await toNftDto(nft);
  }
}
