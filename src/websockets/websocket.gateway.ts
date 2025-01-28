import { Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway as WebSocketGatewayDecorator,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CandyMachineReceiptInput } from '../candy-machine/dto/candy-machine-receipt.dto';
import { ListingInput, toListingDto } from '../auction-house/dto/listing.dto';
import { toWalletAssetDto } from '../wallet/dto/wallet-asset.dto';
import {
  AssetInput,
  toAssetDto,
} from '../digital-asset/dto/deprecated-digital-asset.dto';
import { IndexCoreAssetReturnType } from 'src/webhooks/helius/dto/types';
import { toCollectibleComicMintEventDto } from '../webhooks/helius/dto/assetMintEvent.dto';
import {
  DAILY_DROP_WINNER_ANNOUNCEMENT,
  DAILY_DROPS_ROOM_ID,
} from '../utils/websockets';
import { RewardDto } from 'src/wheel/dto/rewards.dto';
import { RoomData } from './types';

@Injectable()
@WebSocketGatewayDecorator({ cors: true })
export class WebSocketGateway {
  @WebSocketServer() server: Server;

  // TODO: add new client and/or comic-issue whenever someone starts listening?
  // @SubscribeMessage('comic-issue/${id}')
  // https://wanago.io/2021/01/25/api-nestjs-chat-websockets/

  handleWave() {
    this.server.sockets.emit('wave', 'Hello world ' + Math.random().toFixed(4));
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: RoomData,
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = data.roomId ?? data.walletAddress;
    await client.join(roomId);
    console.log(`Socket ${client.id} joined room: ${roomId}`);
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: RoomData,
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = data.roomId ?? data.walletAddress;
    await client.leave(roomId);
    console.log(`Socket ${client.id} left room: ${roomId}`);
  }

  async handleDailyDropWinnerAnnouncement(reward: RewardDto) {
    return this.server
      .to(DAILY_DROPS_ROOM_ID)
      .emit(DAILY_DROP_WINNER_ANNOUNCEMENT, reward);
  }

  async handleWalletCollectibleComicMinted(data: {
    receipt: CandyMachineReceiptInput;
    comicIssueAssets: IndexCoreAssetReturnType[];
  }) {
    const receiptDto = await toCollectibleComicMintEventDto(data);
    const walletAddress = data.receipt.buyerAddress;

    return this.server
      .to(walletAddress)
      .emit(`wallet/${walletAddress}/item-minted`, receiptDto);
  }

  /* Legacy websocket events */
  handleLegacyCollectibleComicMintRejected(comicIssueId: number) {
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-mint-rejected`,
    );
  }

  handleLegacyAssetSold(comicIssueId: number, listing: ListingInput) {
    // TODO: find user based on the listing.sellerAddress
    const listingDto = toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-sold`,
      listingDto,
    );
  }

  handleLegacyAssetListed(comicIssueId: number, listing: ListingInput) {
    const listingDto = toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-listed`,
      listingDto,
    );
  }

  handleLegacyAssetDelisted(comicIssueId: number, listing: ListingInput) {
    const listingDto = toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-delisted`,
      listingDto,
    );
  }

  handleWalletLegacyCollectibleComicMintRejected(buyerAddress: string) {
    return this.server.sockets.emit(
      `wallet/${buyerAddress}/item-mint-rejected`,
    );
  }

  async handleWalletLegacyAssetListed(owner: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    const assetDto = toAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${owner}/item-listed`,
      walletAssetDto,
      assetDto,
    );
  }

  async handleWalletLegacyAssetDelisted(owner: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    const assetDto = toAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${owner}/item-delisted`,
      walletAssetDto,
      assetDto,
    );
  }

  async handleWalletLegacyAssetBought(buyer: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${buyer}/item-bought`,
      walletAssetDto,
    );
  }

  handleWalletLegacyAssetSold(seller: string, listing: ListingInput) {
    const listingDto = toListingDto(listing);
    return this.server.sockets.emit(`wallet/${seller}/item-sold`, listingDto);
  }

  async handleWalletLegacyAssetReceived(receiver: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${receiver}/item-received`,
      walletAssetDto,
    );
  }

  async handleWalletLegacyAssetSent(sender: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${sender}/item-sent`,
      walletAssetDto,
    );
  }

  async handleWalletLegacyAssetUsed(asset: AssetInput) {
    const assetDto = await toAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${assetDto.ownerAddress}/item-used`,
      assetDto,
    );
  }
}
