import { Controller, Get, Query, Param, Post } from '@nestjs/common';
import { DigitalAssetService } from './digital-asset.service';
import { ApiTags } from '@nestjs/swagger';
import { AssetDto, toAssetDto, toAssetDtoArray } from './dto/digital-asset.dto';
import { DigitalAssetFilterParams } from './dto/digital-asset-params.dto';
import {
  CollectibleComicRarityStatsDto,
  toCollectibleComicRarityStatsDtoArray,
} from './dto/collectible-comic-rarity-stats.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { DiscordService } from 'src/discord/discord.service';
import { memoizeThrottle } from 'src/utils/lodash';
import { hours } from '@nestjs/throttler';

/* @deprecated */
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

@ApiTags('Assets')
@Controller('asset')
export class DigitalAssetController {
  constructor(
    private readonly digitalAssetService: DigitalAssetService,
    private readonly discordService: DiscordService,
  ) {}

  /* Get all Assets */
  @Get('get')
  async findAll(@Query() query: DigitalAssetFilterParams): Promise<AssetDto[]> {
    const assets = await this.digitalAssetService.findAll(query);
    return toAssetDtoArray(assets);
  }

  /* Get collectible comic rarity stats */
  @Get('get/collectible-comic/rarity-stats/:collectionAddress')
  async findCollectibleComicRarityStats(
    @Param('collectionAddress') collectionAddress: string,
  ): Promise<CollectibleComicRarityStatsDto[]> {
    const stats =
      await this.digitalAssetService.findCollectibleComicRarityStats(
        collectionAddress,
      );
    return toCollectibleComicRarityStatsDtoArray(stats);
  }

  /* Get specific Asset by unique on-chain address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<AssetDto> {
    const asset = await this.digitalAssetService.findOne(address);
    return toAssetDto(asset);
  }

  private throttledRequestAutograph = memoizeThrottle(
    async (address: string, username: string) =>
      await this.discordService.requestAutograph(username, address),
    hours(24),
  );

  @UserAuth()
  @Post('request-autograph/:address')
  async requestAutograph(
    @Param('address') address: string,
    @UserEntity() user: UserPayload,
  ) {
    return await this.throttledRequestAutograph(address, user.username);
  }

  @Post('create/print-edition-collection/:address')
  async createPrintEditionCollection(@Param('address') address: string) {
    await this.digitalAssetService.createPrintEditionCollection(address);
  }

  @Post('create/one-of-one/:address')
  async createOneOfOne(@Param('address') address: string) {
    await this.digitalAssetService.createOneOfOne(address);
  }

  @Post('create/one-of-one-collection/:address')
  async createOneOfOneCollection(@Param('address') address: string) {
    await this.digitalAssetService.createOneOfOneCollection(address);
  }
}
