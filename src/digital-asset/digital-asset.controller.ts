import { Controller, Get, Query, Param, Post } from '@nestjs/common';
import { DigitalAssetService } from './digital-asset.service';
import { ApiTags } from '@nestjs/swagger';
import { DigitalAssetDto, toDigitalAssetDto } from './dto/digital-asset.dto';
import { CollectibleComicFilterParams } from './dto/digital-asset-params.dto';
import {
  CollectibleComicRarityStatsDto,
  toCollectibleComicRarityStatsDtoArray,
} from './dto/collectible-comic-rarity-stats.dto';
import { UserAuth } from '../guards/user-auth.guard';
import { UserEntity } from '../decorators/user.decorator';
import { UserPayload } from '../auth/dto/authorization.dto';
import {
  CollectibleComicDto,
  toCollectibleComicDtoArray,
} from './dto/collectible-comic.dto';
import { AssetDto, toAssetDtoArray } from './dto/deprecated-digital-asset.dto';
import { AutographRequestFilterParams } from './dto/autograph-request-filter-params.dto';
import { BotGateway } from 'src/discord/bot.gateway';
import { AdminOrCreatorOwner } from 'src/guards/admin-or-creator-owner.guard';
import { AdminGuard } from 'src/guards/roles.guard';
import { PaginatedResponseDto } from 'src/types/paginated-response.dto';
import {
  AutographRequestDto,
  toPaginatedAutographRequestDto,
} from './dto/autograph-request.dto';

@ApiTags('Assets')
@Controller('asset')
export class DigitalAssetController {
  constructor(
    private readonly digitalAssetService: DigitalAssetService,
    private readonly discordBotGateway: BotGateway,
  ) {}

  /** @deprecated */
  @Get('get')
  async findAll(
    @Query() query: CollectibleComicFilterParams,
  ): Promise<AssetDto[]> {
    const collectibleComics = await this.digitalAssetService.findAll(query);
    return toAssetDtoArray(collectibleComics);
  }

  /* Get all collectible comics */
  @Get('get/collectible-comic')
  async findAllCollectibleComics(
    @Query() query: CollectibleComicFilterParams,
  ): Promise<CollectibleComicDto[]> {
    const collectibleComics =
      await this.digitalAssetService.findAllCollectibleComics(query);
    return toCollectibleComicDtoArray(collectibleComics);
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
  async findOne(@Param('address') address: string): Promise<DigitalAssetDto> {
    const asset = await this.digitalAssetService.findOne(address);
    return toDigitalAssetDto(asset);
  }

  @UserAuth()
  @Post('autograph/request/:address')
  async requestAutograph(
    @Param('address') address: string,
    @UserEntity() user: UserPayload,
  ) {
    await this.digitalAssetService.requestCollectibleComicSignature(address);
    await this.discordBotGateway.requestAutograph(user.username, address);
  }

  @AdminOrCreatorOwner()
  @Get('autograph/get/request')
  async getAutographRequests(
    @Query() query: AutographRequestFilterParams,
  ): Promise<PaginatedResponseDto<AutographRequestDto>> {
    const requests = await this.digitalAssetService.findAutographRequests(
      query,
    );
    return toPaginatedAutographRequestDto(requests);
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

  @AdminGuard()
  @Post('sync')
  async syncAllAssets() {
    return await this.digitalAssetService.syncAllAssets();
  }
}
