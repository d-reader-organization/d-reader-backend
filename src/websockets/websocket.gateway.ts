import { Injectable } from '@nestjs/common';
import {
  SubscribeMessage,
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

  @SubscribeMessage('message')
  handleMessage(message: string): void {
    this.server.sockets.emit('message', message);
  }

  @SubscribeMessage('candyMachineReceiptCreated')
  async handleMintReceipt(receipt: CandyMachineReceiptInput): Promise<boolean> {
    const receiptDto = await toCMReceiptDto(receipt);
    return this.server.sockets.emit('candyMachineReceiptCreated', receiptDto);
  }

  async handleListing(comicIssue: number, listing: Listing) {
    console.log(comicIssue, listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssue}/item-listed`,
      listing,
    );
  }

  async handleSale(comicIssue: number, listing: Listing) {
    return this.server.sockets.emit(
      `comic-issue/${comicIssue}/item-sold`,
      listing,
    );
  }

  async handleCancleListing(comicIssue: number, listing: Listing) {
    return this.server.sockets.emit(
      `comic-issue/${comicIssue}/item-delisted`,
      listing,
    );
  }

  async handleWalletMint(receipt: CandyMachineReceiptInput) {
    return this.server.sockets.emit(
      `wallet/${receipt.buyerAddress}/item-mint`,
      receipt,
    );
  }

  async handleWalletListing(owner: string, listing: Listing) {
    return this.server.sockets.emit(`wallet/${owner}/item-listed`, listing);
  }

  async handleWalletSale(owner: string, listing: Listing) {
    return this.server.sockets.emit(`wallet/${owner}/item-sold`, listing);
  }

  async handleWalletCancleListing(owner: string, listing: Listing) {
    return this.server.sockets.emit(`wallet/${owner}/item-delisted`, listing);
  }

  async handleWalletBuy(buyer: string, nft: Nft) {
    return this.server.sockets.emit(`wallet/${buyer}/item-bought`, nft);
  }

  async handleWalletNftReceived(receiver: string, nft: Nft) {
    return this.server.sockets.emit(`wallet/${receiver}/item-received`, nft);
  }

  async handleWalletNftSent(sender: string, nft: Nft) {
    return this.server.sockets.emit(`wallet/${sender}/item-sent`, nft);
  }
}
