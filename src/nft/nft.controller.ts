import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { NftService } from './nft.service';
import { ApiTags } from '@nestjs/swagger';
import { NftDto, toNftDto, toNftDtoArray } from './dto/nft.dto';
import { FilterParams } from './dto/nft-params.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(ThrottlerGuard)
@ApiTags('NFTs')
@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  /* Get all NFTs */
  @Get('get')
  async findAll(@Query() query: FilterParams): Promise<NftDto[]> {
    const nfts = await this.nftService.findAll(query);
    return toNftDtoArray(nfts);
  }

  /* Get specific NFT by unique on-chain address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<NftDto> {
    const nft = await this.nftService.findOne(address);
    return toNftDto(nft);
  }
}
