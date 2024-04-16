import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log } from './chalk';
import { clusterHeliusApiUrl } from '../utils/helius';
import { DAS } from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { HeliusService } from '../webhooks/helius/helius.service';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../utils/nft-metadata';
import { isEmpty } from 'lodash';
import { Prisma } from '@prisma/client';
import { fetchCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { umi } from '../utils/metaplex';

interface Options {
  collection: string;
}

@Command({
  name: 'sync-core-asset',
  description: 'sync the core assets of a provided collection',
})
export class SyncCoreAssetCommand extends CommandRunner {
  private readonly umi: Umi;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {
    super();
    this.umi = umi;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('sync-core-asset', options);
    await this.syncCoreAsset(options);
  }

  syncCoreAsset = async (options: Options) => {
    log('\n🏗️  Syncing...');
    // TODO: If collection exists in our db
    const candyMachine = await this.prisma.candyMachine.findFirst({
      where: { collectionNftAddress: options.collection },
    });
    if (!candyMachine) {
      throw Error("Collection doesn't exists in database");
    }
    const limit = 200;
    let page = 1;
    let data = await getAssetsByGroup(options.collection, page, limit);
    const syncedAssets = await this.prisma.nft.findMany({
      where: { collectionNftAddress: options.collection },
    });
    let syncedItems = 0;
    while (!isEmpty(data)) {
      const unsyncedNfts = data.filter(
        (asset) => !syncedAssets.find((item) => item.address === asset.id),
      );
      console.log(`Syncing ${unsyncedNfts.length} assets...!`);
      const promises = unsyncedNfts.map((asset) =>
        this.indexCoreAsset(
          asset,
          candyMachine.address,
          candyMachine.collectionNftAddress,
        ),
      );
      await Promise.all(promises);

      page++;
      data = await getAssetsByGroup(options.collection, page, limit);
      syncedItems += unsyncedNfts.length;
      console.log(`Synced ${syncedItems} items`);
    }
  };

  async indexCoreAsset(
    asset: DAS.GetAssetResponse,
    candyMachineAddress: string,
    collection: string,
  ) {
    const offChainMetadata = await fetchOffChainMetadata(
      asset.content.json_uri,
    );
    const walletAddress = asset.ownership.owner;
    const { owner } = await this.prisma.nft.create({
      include: {
        owner: true,
      },
      data: {
        address: asset.id,
        name: asset.content.metadata.name,
        ownerChangedAt: new Date(),
        metadata: {
          connectOrCreate: {
            where: { uri: asset.content.json_uri },
            create: {
              collectionName: offChainMetadata.name,
              uri: asset.content.json_uri,
              isUsed: findUsedTrait(offChainMetadata),
              isSigned: findSignedTrait(offChainMetadata),
              rarity: findRarityTrait(offChainMetadata),
            },
          },
        },
        owner: {
          connectOrCreate: {
            where: { address: walletAddress },
            create: { address: walletAddress },
          },
        },
        candyMachine: { connect: { address: candyMachineAddress } },
        collectionNft: {
          connect: { address: collection },
        },
      },
    });

    const doesReceiptExists = await this.prisma.candyMachineReceipt.findFirst({
      where: { nftAddress: asset.id },
    });

    if (!doesReceiptExists) {
      try {
        const UNKNOWN = 'UNKNOWN';
        const userId: number = owner?.userId;
        const receiptData: Prisma.CandyMachineReceiptCreateInput = {
          nft: { connect: { address: asset.id } },
          candyMachine: { connect: { address: candyMachineAddress } },
          buyer: {
            connectOrCreate: {
              where: { address: walletAddress },
              create: { address: walletAddress },
            },
          },
          price: 0,
          timestamp: new Date(),
          description: `${walletAddress} minted ${asset.content.metadata.name} for ${UNKNOWN} SOL.`,
          splTokenAddress: UNKNOWN,
          transactionSignature: UNKNOWN,
          label: UNKNOWN,
        };

        if (userId) {
          receiptData.user = { connect: { id: userId } };
        }

        await this.prisma.candyMachineReceipt.create({
          data: receiptData,
        });
      } catch (e) {
        console.error(
          `Failed to create candymachine receipt for nft ${asset.id}`,
          e,
        );
      }
    }

    try {
      const candyMachine = await fetchCandyMachine(
        this.umi,
        publicKey(candyMachineAddress),
      );

      const itemsRemaining =
        Number(candyMachine.data.itemsAvailable) -
        Number(candyMachine.itemsRedeemed);

      await this.prisma.candyMachine.update({
        where: { address: candyMachineAddress },
        data: {
          itemsRemaining,
          itemsMinted: Number(candyMachine.itemsRedeemed),
        },
      });

      if (itemsRemaining === 0) {
        this.heliusService.removeSubscription(
          candyMachine.publicKey.toString(),
        );
      }
    } catch (e) {
      console.error(`Failed to sync candymachine ${candyMachineAddress}`, e);
    }
    this.heliusService.subscribeTo(asset.id);
  }
}

const getAssetsByGroup = async (
  collection: string,
  page: number,
  limit: number,
): Promise<DAS.GetAssetResponse[]> => {
  const url = clusterHeliusApiUrl(process.env.HELIUS_API_KEY);
  const params: DAS.AssetsByGroupRequest = {
    groupKey: 'collection',
    groupValue: collection,
    page,
    limit,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAssetsByGroup',
      params,
    }),
  });
  const { result } = await response.json();
  return result.items;
};
