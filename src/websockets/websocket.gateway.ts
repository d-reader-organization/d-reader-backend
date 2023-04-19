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
import { Nft } from '@prisma/client';
import { ListingInput, toListingDto } from '../auction-house/dto/listing.dto';
import { toWalletAssetDto } from '../wallet/dto/wallet-asset.dto';
import { toNftDto } from '../nft/dto/nft.dto';

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

  async handleNftSold(comicIssueId: number, listing: ListingInput) {
    const listingDto = await toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-sold`,
      listingDto,
    );
  }

  async handleNftListed(comicIssueId: number, listing: ListingInput) {
    const listingDto = await toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-listed`,
      listingDto,
    );
  }

  async handleNftDelisted(comicIssueId: number, listing: ListingInput) {
    const listingDto = await toListingDto(listing);
    return this.server.sockets.emit(
      `comic-issue/${comicIssueId}/item-delisted`,
      listingDto,
    );
  }

  async handleWalletNftMinted(receipt: CandyMachineReceiptInput) {
    const receiptDto = await toCMReceiptDto(receipt);
    return this.server.sockets.emit(
      `wallet/${receipt.buyerAddress}/item-minted`,
      receiptDto,
    );
  }

  async handleWalletNftListed(owner: string, nft: Nft) {
    const walletAssetDto = await toWalletAssetDto(nft);
    const nftDto = toNftDto(nft);
    return this.server.sockets.emit(
      `wallet/${owner}/item-listed`,
      walletAssetDto,
      nftDto,
    );
  }

  async handleWalletNftDelisted(owner: string, nft: Nft) {
    const walletAssetDto = await toWalletAssetDto(nft);
    const nftDto = toNftDto(nft);
    return this.server.sockets.emit(
      `wallet/${owner}/item-delisted`,
      walletAssetDto,
      nftDto,
    );
  }

  async handleWalletNftBought(buyer: string, nft: Nft) {
    const walletAssetDto = await toWalletAssetDto(nft);
    return this.server.sockets.emit(
      `wallet/${buyer}/item-bought`,
      walletAssetDto,
    );
  }

  async handleWalletNftSold(seller: string, listing: ListingInput) {
    const listingDto = await toListingDto(listing);
    return this.server.sockets.emit(`wallet/${seller}/item-sold`, listingDto);
  }

  async handleWalletNftReceived(receiver: string, nft: Nft) {
    const walletAssetDto = await toWalletAssetDto(nft);
    return this.server.sockets.emit(
      `wallet/${receiver}/item-received`,
      walletAssetDto,
    );
  }

  async handleWalletNftSent(sender: string, nft: Nft) {
    const walletAssetDto = await toWalletAssetDto(nft);
    return this.server.sockets.emit(
      `wallet/${sender}/item-sent`,
      walletAssetDto,
    );
  }
}
