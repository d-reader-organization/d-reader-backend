import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { PrismaService } from 'nestjs-prisma';
import { ComicRarity } from '@prisma/client';
import { transfer } from '@metaplex-foundation/mpl-core';
import { publicKey, Umi } from '@metaplex-foundation/umi';
import { getTreasuryPublicKey, umi } from '../utils/metaplex';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { MIN_COMPUTE_PRICE } from '../constants';

interface Options {
  destinationAddress: string;
  collectionAddress: string;
  rarity: ComicRarity;
  supply: number;
}

@Command({
  name: 'vault-transfer',
  description: 'transfer assets from vault',
})
export class VaultTransferCommand extends CommandRunner {
  private readonly umi: Umi;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.umi = umi;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('vault-transfer', options);
    await this.vaultTransfer(options);
  }

  vaultTransfer = async (options: Options) => {
    log('\n🏗️  transfer assets from vault');
    try {
      const { destinationAddress, collectionAddress, rarity, supply } = options;
      const ownerAddress = getTreasuryPublicKey();
      let rarityFilter = undefined;
      if (rarity !== ComicRarity.None) {
        rarityFilter = rarity;
      }

      console.log(options);
      const assets = await this.prisma.digitalAsset.findMany({
        where: {
          ownerAddress: ownerAddress.toString(),
          collectibleComic: {
            metadata: { rarity: rarityFilter, collectionAddress },
          },
        },
      });

      const BATCH_SIZE = 3;
      let transferred = 0;
      let remaining = Math.min(supply, assets.length);

      while (remaining > 0) {
        try {
          const batchSize = Math.min(BATCH_SIZE, remaining);
          const assetAddresses = assets
            .slice(transferred, transferred + batchSize)
            .map((asset) => asset.address);

          await this.transfer(
            assetAddresses,
            collectionAddress,
            destinationAddress,
          );

          transferred += batchSize;
          remaining -= batchSize;
        } catch (e) {
          logErr(`Failed to transfer: ${e}`);
          break;
        }
      }

      console.log(`Transferred ${supply - remaining} assets`);
    } catch (error) {
      logErr(`Error : ${error}`);
    }
  };
  async transfer(
    assetAddresses: string[],
    collectionAddress: string,
    destinationAddress: string,
  ) {
    const ownerAddress = getTreasuryPublicKey();
    let builder = setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    });
    for (const assetAddress of assetAddresses) {
      builder = builder.add(
        transfer(this.umi, {
          asset: {
            publicKey: publicKey(assetAddress),
            owner: publicKey(ownerAddress),
          },
          collection: { publicKey: publicKey(collectionAddress) },
          newOwner: publicKey(destinationAddress),
        }),
      );
    }
    const transaction = await builder.buildAndSign(this.umi);
    const latestBlockhash = await this.umi.rpc.getLatestBlockhash({
      commitment: 'confirmed',
    });

    const signature = await this.umi.rpc.sendTransaction(transaction, {
      commitment: 'confirmed',
    });
    await this.umi.rpc.confirmTransaction(signature, {
      commitment: 'confirmed',
      strategy: { type: 'blockhash', ...latestBlockhash },
    });
    console.log(`Transferred ${assetAddresses.length} assets`);
  }
}
