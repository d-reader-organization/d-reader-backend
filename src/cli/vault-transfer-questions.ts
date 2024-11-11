import { ComicRarity } from '@prisma/client';
import { QuestionSet, Question } from 'nest-commander';
import { PrismaService } from 'nestjs-prisma';
import { getTreasuryPublicKey } from '../utils/metaplex';

@QuestionSet({ name: 'vault-transfer' })
export class VaultTransferQuestions {
  constructor(private readonly prisma: PrismaService) {}

  @Question({
    type: 'input',
    name: 'destinationAddress',
    message: 'Address to transfer the assets',
    validate: async function (destinationAddress: string) {
      if (!destinationAddress) return false;
      return true;
    },
  })
  parseDestinationAddress(destinationAddress: string): string {
    return destinationAddress;
  }

  @Question({
    type: 'input',
    name: 'collectionAddress',
    message: 'Collection Address',
    validate: async function (collectionAddresses: string) {
      if (!collectionAddresses) return false;
      return true;
    },
  })
  parseCollectionAddresses(collectionAddresses: string): string {
    return collectionAddresses;
  }

  @Question({
    type: 'list',
    name: 'rarity',
    choices: async function (answers: any) {
      const collectionAddress = answers.collectionAddress;
      const instance = this as unknown as VaultTransferQuestions;
      const ownerAddress = getTreasuryPublicKey().toString();

      const rarityGroups = await instance.prisma.collectibleComic.groupBy({
        by: ['uri'],
        where: {
          metadata: {
            collectionAddress: collectionAddress,
          },
          digitalAsset: {
            ownerAddress,
          },
        },
        _count: {
          _all: true,
        },
      });

      const metadatas = await instance.prisma.collectibleComicMetadata.findMany(
        {
          where: { collectionAddress, isUsed: false, isSigned: false },
        },
      );

      const rarityCount = metadatas.map((metadata) => {
        const count =
          rarityGroups.find((g) => g.uri === metadata.uri)?._count._all || 0;
        return {
          name: `${metadata.rarity} : ${count}`,
          value: metadata.rarity,
        };
      });

      rarityCount.push({ name: 'Random', value: 'None' });
      return rarityCount;
    },
    message: 'Which rarity do you want to transfer?',
    validate: async function (value: string) {
      if (!value) {
        return 'Please provide a valid value';
      }
      return true;
    },
  })
  parseRarity(rarity: string): ComicRarity {
    return ComicRarity[rarity];
  }

  @Question({
    type: 'input',
    name: 'supply',
    message: 'Number of assets to transfer',
  })
  parseSupply(supply: number): number {
    return supply;
  }
}
