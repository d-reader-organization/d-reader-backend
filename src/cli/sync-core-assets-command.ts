import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log } from './chalk';
import { DAS } from 'helius-sdk';
import { PrismaService } from 'nestjs-prisma';
import { HeliusService } from '../webhooks/helius/helius.service';
import { isEmpty } from 'lodash';
import { CouponType, Prisma, TransactionStatus } from '@prisma/client';
import { fetchCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { umi } from '../utils/metaplex';
import { getAssetsByGroup } from '../utils/das';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';

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
    const limit = 200;
    let page = 1;
    let data = await getAssetsByGroup(options.collection, page, limit);

    const syncedAssets = await this.prisma.collectibleComic.findMany({
      where: { metadata: { collectionAddress: options.collection } },
      include: { digitalAsset: true },
    });
    let syncedItems = 0;
    while (!isEmpty(data)) {
      const unsyncedNfts = data.filter((asset) => {
        const dbAsset = syncedAssets.find((item) => item.address === asset.id);
        if (!dbAsset) {
          this.heliusService.subscribeTo(asset.id);
        }
        return !(
          dbAsset &&
          dbAsset.digitalAsset.ownerAddress == asset.ownership.owner &&
          dbAsset.uri === asset.content.json_uri
        );
      });

      console.log(`Syncing ${unsyncedNfts.length} assets...!`);
      const promises = unsyncedNfts.map((asset) =>
        this.indexCoreAsset(asset, options.collection),
      );
      await Promise.all(promises);

      page++;
      data = await getAssetsByGroup(options.collection, page, limit);
      syncedItems += unsyncedNfts.length;
      console.log(`Synced ${syncedItems} items`);
    }
  };

  async indexCoreAsset(asset: DAS.GetAssetResponse, collectionAddress: string) {
    const candyMachineReceipt = await this.prisma.candyMachineReceipt.findFirst(
      {
        where: { collectibleComics: { some: { address: asset.id } } },
      },
    );

    const doesReceiptExists = !!candyMachineReceipt;
    let candyMachineAddress: string;

    if (doesReceiptExists) {
      candyMachineAddress = candyMachineReceipt.candyMachineAddress;
    } else {
      const candyMachine = await this.prisma.candyMachine.findFirst({
        where: { collectionAddress },
      });

      if (!candyMachine) {
        throw Error("Collection doesn't exists in database");
      }
      candyMachineAddress = candyMachine.address;
    }

    const walletAddress = asset.ownership.owner;
    const digitalAsset = await this.heliusService.reIndexAsset(
      asset,
      candyMachineAddress,
    );

    const owner = digitalAsset.owner;
    /** If receipt doesn't exists for a asset, it might be hard to get the actual signauture with all asset created in batch but we can create multiple receipts for all those assets here */
    if (!doesReceiptExists) {
      try {
        const coupon = await this.prisma.candyMachineCoupon.findFirst({
          where: {
            candyMachineAddress,
            type: CouponType.PublicUser,
            currencySettings: {
              some: {
                splTokenAddress: WRAPPED_SOL_MINT.toString(),
              },
            },
          },
        });

        const UNKNOWN = 'UNKNOWN';
        const userId: number = owner?.userId;
        const receiptData: Prisma.CandyMachineReceiptCreateInput = {
          collectibleComics: { connect: { address: asset.id } },
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
          status: TransactionStatus.Confirmed,
          numberOfItems: 1,
          couponId: coupon.id,
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
      console.error(
        `Failed to sync candymachine ${candyMachineAddress}, Maybe it's a minted out collection`,
      );
    }
  }
}
