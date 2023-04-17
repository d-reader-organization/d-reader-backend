import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway as WebSocketGatewayDecorator,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  CandyMachineReceiptInput,
  toCMReceiptDto,
} from '../candy-machine/dto/candy-machine-receipt.dto';
import { Listing, Nft } from '@prisma/client';

@Injectable()
@WebSocketGatewayDecorator({ cors: true })
export class WebSocketGateway {
  @WebSocketServer() server: Server;

  // TODO: add new client and/or comic-issue whenever someone starts listening?
  // @SubscribeMessage('comic-issue/${id}')
  // https://wanago.io/2021/01/25/api-nestjs-chat-websockets/
  // @josip ChatGPT input

  handleWave() {
    this.server.sockets.emit('wave', 'Hello world ' + Math.random().toFixed(4));
  }

  async handleNftMinted(
    comicIssueId: number,
    receipt: CandyMachineReceiptInput,
  ) {
    const receiptDto = await toCMReceiptDto(receipt);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-minted`,
      receiptDto,
    );
  }

  // TODO: return ListingDto objects
  async handleNftSold(comicIssueId: number, listing: Listing) {
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-sold`,
      listing,
    );
  }

  // TODO: return ListingDto objects
  async handleNftListed(comicIssueId: number, listing: Listing) {
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-listed`,
      listing,
    );
  }

  // TODO: return ListingDto objects
  async handleNftDelisted(comicIssueId: number, listing: Listing) {
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-delisted`,
      listing,
    );
  }

  async handleWalletNftMinted(receipt: CandyMachineReceiptInput) {
    const receiptDto = await toCMReceiptDto(receipt);
    return this.server.sockets.emit(
      `wallet/${receipt.buyerAddress}/item-minted`,
      receiptDto,
    );
  }

  // TODO: this should also emit WalletAssetDto & NftDto? Check with @Luka
  async handleWalletNftListed(owner: string, listing: Listing) {
    return this.server.sockets.emit(`wallet/${owner}/item-listed`, listing);
  }

  // TODO: this should also emit WalletAssetDto & NftDto? Check with @Luka
  async handleWalletNftDelisted(owner: string, listing: Listing) {
    return this.server.sockets.emit(`wallet/${owner}/item-delisted`, listing);
  }

  // TODO: this should emit WalletAssetDto? Check with @Luka
  async handleWalletNftBought(buyer: string, nft: Nft) {
    return this.server.sockets.emit(`wallet/${buyer}/item-bought`, nft);
  }

  async handleWalletNftSold(seller: string, listing: Listing) {
    return this.server.sockets.emit(`wallet/${seller}/item-sold`, listing);
  }

  // TODO: this should emit WalletAssetDto? Check with @Luka
  async handleWalletNftReceived(receiver: string, nft: Nft) {
    return this.server.sockets.emit(`wallet/${receiver}/item-received`, nft);
  }

  // TODO: this should emit WalletAssetDto? Check with @Luka
  async handleWalletNftSent(sender: string, nft: Nft) {
    return this.server.sockets.emit(`wallet/${sender}/item-sent`, nft);
  }
}
