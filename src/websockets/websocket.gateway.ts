import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway as WebSocketGatewayDecorator,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { CandyMachineReceiptInput } from '../candy-machine/dto/candy-machine-receipt.dto';
import { ListingInput, toListingDto } from '../auction-house/dto/listing.dto';
import { toWalletAssetDto } from '../wallet/dto/wallet-asset.dto';
import { AssetInput, toAssetDto } from '../digital-asset/dto/digital-asset.dto';
import { IndexCoreAssetReturnType } from 'src/webhooks/helius/dto/types';
import { toAssetMintEventDto } from 'src/webhooks/helius/dto/assetMintEvent.dto';

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

  async handleAssetMinted(
    comicIssueId: number,
    data: {
      receipt: CandyMachineReceiptInput;
      comicIssueAssets: IndexCoreAssetReturnType[];
    },
  ) {
    const receiptDto = await toAssetMintEventDto(data);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-minted`,
      receiptDto,
    );
  }

  handleAssetMintRejected(comicIssueId: number) {
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-mint-rejected`,
    );
  }

  async handleAssetSold(comicIssueId: number, listing: ListingInput) {
    const listingDto = await toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-sold`,
      listingDto,
    );
  }

  async handleAssetListed(comicIssueId: number, listing: ListingInput) {
    const listingDto = await toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-listed`,
      listingDto,
    );
  }

  async handleAssetDelisted(comicIssueId: number, listing: ListingInput) {
    const listingDto = await toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-delisted`,
      listingDto,
    );
  }

  async handleWalletAssetMinted(data: {
    receipt: CandyMachineReceiptInput;
    comicIssueAssets: IndexCoreAssetReturnType[];
  }) {
    const receiptDto = await toAssetMintEventDto(data);
    return this.server.sockets.emit(
      `wallet/${data.receipt.buyerAddress}/item-minted`,
      receiptDto,
    );
  }

  handleWalletAssetMintRejected(buyerAddress: string) {
    return this.server.sockets.emit(
      `wallet/${buyerAddress}/item-mint-rejected`,
    );
  }

  async handleWalletAssetListed(owner: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    const assetDto = toAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${owner}/item-listed`,
      walletAssetDto,
      assetDto,
    );
  }

  async handleWalletAssetDelisted(owner: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    const assetDto = toAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${owner}/item-delisted`,
      walletAssetDto,
      assetDto,
    );
  }

  async handleWalletAssetBought(buyer: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${buyer}/item-bought`,
      walletAssetDto,
    );
  }

  async handleWalletAssetSold(seller: string, listing: ListingInput) {
    const listingDto = await toListingDto(listing);
    return this.server.sockets.emit(`wallet/${seller}/item-sold`, listingDto);
  }

  async handleWalletAssetReceived(receiver: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${receiver}/item-received`,
      walletAssetDto,
    );
  }

  async handleWalletAssetSent(sender: string, asset: AssetInput) {
    const walletAssetDto = await toWalletAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${sender}/item-sent`,
      walletAssetDto,
    );
  }

  async handleWalletAssetUsed(asset: AssetInput) {
    const assetDto = await toAssetDto(asset);
    return this.server.sockets.emit(
      `wallet/${assetDto.ownerAddress}/item-used`,
      assetDto,
    );
  }
}
