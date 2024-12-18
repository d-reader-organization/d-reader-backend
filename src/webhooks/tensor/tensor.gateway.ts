import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import * as WebSocket from 'ws';
import { HeliusService } from '../helius/helius.service';
import { TENSOR_ASSET } from '../helius/dto/types';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TensorSocketGateway implements OnModuleInit, OnModuleDestroy {
  private socket: WebSocket;
  private readonly TENSOR_API_KEY = process.env.TENSOR_API_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {}

  onModuleInit() {
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
          if (
            parsedData.type == 'newTransaction' &&
            parsedData.data.tx.tx.txType == 'ADJUST_PRICE'
          ) {
            const asset: TENSOR_ASSET = parsedData.tx.mint;
            await this.heliusService.handleCoreListing(asset);
          }
        }
      } catch (e) {
        console.error(`Error on handling tensor 'message' event`, e);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Tesnor WebSocket Error:', error);
    });

    this.socket.on('close', () => {
      console.log('Disconnected from Tensor WebSocket endpoint');
    });
  }

  onModuleDestroy() {
    if (this.socket) {
      this.socket.close();
      console.log('WebSocket connection closed');
    }
  }

  //Every 1 minutes to not close socket connection
  @Cron('*/1 * * * *')
  sendPing() {
    this.socket.send(JSON.stringify({ event: 'ping', payload: {} }));
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
