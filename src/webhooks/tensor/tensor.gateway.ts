import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import * as WebSocket from 'ws';
import { HeliusService } from '../helius/helius.service';
import { Cron } from '@nestjs/schedule';
import { isEmpty } from 'lodash';

@Injectable()
export class TensorSocketGateway implements OnModuleInit, OnModuleDestroy {
  private socket: WebSocket;
  private readonly TENSOR_API_KEY = process.env.TENSOR_API_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {}

  onModuleInit() {
    this.openConnection();
  }

  onModuleDestroy() {
    if (this.socket) {
      this.close();
      console.log('WebSocket connection closed');
    }
  }

  // Every 1 minutes to not close socket connection
  @Cron('*/1 * * * *')
  sendPing() {
    console.log('Tensor socket: ping');
    this.socket.send(
      JSON.stringify({
        event: 'ping',
        payload: {},
      }),
    );
  }

  openConnection() {
    if (isEmpty(this.TENSOR_API_KEY)) {
      console.warn(
        'Tensor api key is required to create socket connection with Tensor',
      );
      return;
    }

    this.socket = new WebSocket('wss://api.mainnet.tensordev.io/ws', {
      headers: {
        'x-tensor-api-key': this.TENSOR_API_KEY,
      },
    });

    this.socket.on('open', async () => {
      console.log('Connected to Tensor WebSocket endpoint');
      this.socket.send(
        JSON.stringify({
          event: 'ping',
          payload: {},
        }),
      );
      await this.listenToCollections();
    });

    this.socket.on('message', async (data: WebSocket.Data) => {
      try {
        const event_stringified = data?.toString();

        if (event_stringified !== '' && event_stringified !== null) {
          const parsedData = JSON.parse(event_stringified);
          if (parsedData.type == 'newTransaction') {
            const tx = parsedData.data.tx.tx;
            const txId = tx.txId;

            switch (tx.txType) {
              case 'ADJUST_PRICE': {
                const mint = tx.mintOnchainId;
                const price = tx.grossAmount;
                const seller = tx.sellerId;

                await this.heliusService.handleTensorListing(
                  seller,
                  mint,
                  price,
                  txId,
                );
                break;
              }
              case 'DELIST': {
                const mint = tx.mintOnchainId;
                await this.heliusService.handleCancelTensorListing(mint);
                break;
              }
              case 'LIST': {
                const mint = tx.mintOnchainId;
                const price = tx.grossAmount;
                const seller = tx.sellerId;

                await this.heliusService.handleTensorListing(
                  seller,
                  mint,
                  price,
                  txId,
                );
                break;
              }
              case 'SALE_BUY_NOW': {
                const mint = tx.mintOnchainId;
                const price = tx.grossAmount;
                const buyerId = tx.buyerId;

                await this.heliusService.handleTensorBuying(
                  buyerId,
                  mint,
                  price,
                  txId,
                );
                break;
              }
            }
          } else if (parsedData.type == 'pong') {
            console.log('Tensor socket: pong');
          }
        }
      } catch (e) {
        console.error(`Error on handling tensor 'message' event`, e);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Tensor WebSocket Error:', error);
    });

    this.socket.on('close', () => {
      console.log(
        'Disconnected from Tensor WebSocket endpoint, Connecting again ..!',
      );
      this.close();
      this.openConnection();
    });
  }

  close() {
    this.socket.removeEventListener('message');
    this.socket.removeEventListener('error');
    this.socket.removeEventListener('close');
    this.socket.close();
  }

  async listenToCollections() {
    const collections = await this.prisma.collectibleComicCollection.findMany({
      select: { tensorCollectionID: true },
    });
    for (const collection of collections) {
      if (collection.tensorCollectionID) {
        this.socket.send(
          JSON.stringify({
            event: 'newTransaction',
            payload: {
              collId: collection.tensorCollectionID,
            },
          }),
        );
      }
    }
  }
}
