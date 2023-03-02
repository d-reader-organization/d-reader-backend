import {
  Controller,
  Get,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common';
import { NftService } from './nft.service';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NftDto, toNftDtoArray } from './dto/nft.dto';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { Wallet } from '@prisma/client';
import { Pagination } from 'src/types/pagination.dto';
import { NftFilterParams } from './dto/nft-filter-params.dto';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('NFTs')
@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  /* Get all NFTs owned by the authorized wallet */
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('get/my-items')
  async findMy(
    @WalletEntity() wallet: Wallet,
    @Query() query: NftFilterParams,
  ): Promise<NftDto[]> {
    const nfts = await this.nftService.findAll(query, wallet.address);
    return await toNftDtoArray(nfts);
  }

  /* Get all NFTs */
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('get')
  async findAll(@Query() query: Pagination): Promise<NftDto[]> {
    const nfts = await this.nftService.findAll(query);
    return await toNftDtoArray(nfts);
  }
}
