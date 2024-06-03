import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { DigitalAssetService } from './digital-asset.service';
import { ApiTags } from '@nestjs/swagger';
import { AssetDto, toAssetDto, toAssetDtoArray } from './dto/digital-asset.dto';
import { DigitalAssetFilterParams } from './dto/digital-asset-params.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

/* @deprecated */
@UseGuards(ThrottlerGuard)
@ApiTags('NFTs')
@Controller('nft')
export class NftController {
  constructor(private readonly nftService: DigitalAssetService) {}

  /* Get all Assets */
  @Get('get')
  async findAll(@Query() query: DigitalAssetFilterParams): Promise<AssetDto[]> {
    const assets = await this.nftService.findAll(query);
    return toAssetDtoArray(assets);
  }

  /* Get specific NFT by unique on-chain address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<AssetDto> {
    const asset = await this.nftService.findOne(address);
    return toAssetDto(asset);
  }
}

@UseGuards(ThrottlerGuard)
@ApiTags('Assets')
@Controller('asset')
export class DigitalAssetController {
  constructor(private readonly digitalAssetService: DigitalAssetService) {}

  /* Get all Assets */
  @Get('get')
  async findAll(@Query() query: DigitalAssetFilterParams): Promise<AssetDto[]> {
    const assets = await this.digitalAssetService.findAll(query);
    return toAssetDtoArray(assets);
  }

  /* Get specific Asset by unique on-chain address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<AssetDto> {
    const asset = await this.digitalAssetService.findOne(address);
    return toAssetDto(asset);
  }
}
