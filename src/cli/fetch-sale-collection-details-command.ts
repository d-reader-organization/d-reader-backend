import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { PrismaService } from 'nestjs-prisma';
import { isEmpty } from 'lodash';
import { ComicRarity } from '@prisma/client';
import { Umi } from '@metaplex-foundation/umi';
import { umi } from '../utils/metaplex';
import { getAssetsByGroup } from '../utils/das';
import { PUBLIC_GROUP_LABEL, getRarityShareTable } from '../constants';
import { toSol } from '../utils/helpers';
import { cb, cerr, cg, chb, log } from './chalk';

interface Options {
  collection: string;
  parentCollection?: string;
}

@Command({
  name: 'fetch-collection-sale-details',
  description: 'fetch sale details of a collection',
})
export class FetchCollectionSaleDetailsCommand extends CommandRunner {
  private readonly umi: Umi;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.umi = umi;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask(
      'fetch-collection-sale-details',
      options,
    );
    await this.fetchCollectionSaleDetails(options);
  }

  async fetchCollectionSaleDetails(options: Options) {
    const { collection, parentCollection } = options;
    const collectionData = await this.prisma.collection.findFirst({
      where: { address: collection },
    });

    const groups = await this.prisma.candyMachineGroup.findMany({
      where: {
        candyMachine: { collectionAddress: collection },
      },
    });

    const candyMachine = await this.prisma.candyMachine.findFirst({
      where: { collectionAddress: collection },
    });
    const items = await this.prisma.digitalAsset.findMany({
      where: { candyMachineAddress: candyMachine.address },
      include: { metadata: true },
    });

    const rarityCount =
      (await this.prisma.metadata.count({
        where: { collectionAddress: collection },
      })) / 4;

    // Find how many of each rarity is minted and their attribute data
    const rarityShares = getRarityShareTable(rarityCount);
    const itemRarityData: {
      rarity: ComicRarity;
      minted: number;
      unwrapped: number;
      signed: number;
      left: number;
    }[] = [];

    let supplyLeft = candyMachine.supply;
    const itr = 0;
    for (const rarityShare of rarityShares) {
      const rarityFilteredItems = items.filter(
        (item) => item.metadata.rarity == rarityShare.rarity,
      );
      const rarityMintCount = rarityFilteredItems.length;
      const rarityUnwrappedCount = rarityFilteredItems.filter(
        (item) => item.metadata.isUsed,
      ).length;
      const raritySignedCount = rarityFilteredItems.filter(
        (item) => item.metadata.isSigned,
      ).length;

      let raritySupply: number;
      if (itr == rarityShares.length - 1) {
        raritySupply = supplyLeft;
      } else {
        raritySupply = Math.floor(
          (candyMachine.supply * rarityShare.value) / 100,
        );
        supplyLeft -= raritySupply;
      }

      itemRarityData.push({
        rarity: rarityShare.rarity,
        minted: rarityMintCount,
        unwrapped: rarityUnwrappedCount,
        signed: raritySignedCount,
        left: Math.abs(rarityMintCount - raritySupply),
      });
    }

    // calculate user mints , public mints and their details
    const userMints = await this.prisma.candyMachineReceipt.count({
      where: {
        candyMachineAddress: candyMachine.address,
        userId: { not: null },
      },
    });

    const publicMints = await this.prisma.candyMachineReceipt.count({
      where: {
        candyMachineAddress: candyMachine.address,
        OR: [
          { label: { startsWith: PUBLIC_GROUP_LABEL } },
          { label: 'UNKNOWN', AND: { userId: null } },
        ],
      },
    });

    const publicGroup = groups.find(
      (group) => group.label === PUBLIC_GROUP_LABEL,
    );
    const userGroup = groups.find((group) => group.label === 'user');

    const publicMintRevenue = toSol(
      publicMints * Number(publicGroup.mintPrice),
    );
    const userMintRevenue = toSol(userMints * Number(userGroup.mintPrice));
    const totalRevenue = publicMintRevenue + userMintRevenue;

    // new registered users and minters
    const registerationStartDate = new Date(userGroup.startDate.getTime());
    registerationStartDate.setDate(registerationStartDate.getDate() - 1);

    const registerationEndDate = new Date(userGroup.startDate.getTime());
    registerationEndDate.setDate(registerationEndDate.getDate() + 7);

    const newRegistersIn1WeekOfMint = await this.prisma.user.count({
      where: {
        createdAt: { lte: registerationEndDate, gte: registerationStartDate },
      },
    });

    const newRegisteredUserMints = await this.prisma.candyMachineReceipt.count({
      where: {
        candyMachineAddress: candyMachine.address,
        user: {
          createdAt: { lte: registerationEndDate, gte: registerationStartDate },
        },
      },
    });

    // Parent collection holders details
    let numberOfMintsByParentCollectionHolders: number,
      numberOfMintsByHolderAndUser: number,
      totalRevenueGeneratedByHolders: number;
    if (parentCollection) {
      const holders: string[] = [];

      const limit = 1000;
      let page = 1;
      let data = await getAssetsByGroup(parentCollection, page, limit);
      while (!isEmpty(data)) {
        const unIndexedHolders = data
          .filter(
            (asset) =>
              !holders.find((holder) => holder === asset.ownership.owner),
          )
          .map((data) => data.ownership.owner);
        holders.push(...unIndexedHolders);

        page += 1;
        data = await getAssetsByGroup(parentCollection, page, limit);
      }

      numberOfMintsByParentCollectionHolders =
        await this.prisma.candyMachineReceipt.count({
          where: {
            candyMachineAddress: candyMachine.address,
            buyerAddress: { in: holders },
          },
        });

      numberOfMintsByHolderAndUser =
        await this.prisma.candyMachineReceipt.count({
          where: {
            candyMachineAddress: candyMachine.address,
            buyerAddress: { in: holders },
            userId: { not: null },
          },
        });

      totalRevenueGeneratedByHolders =
        toSol(numberOfMintsByHolderAndUser * Number(userGroup.mintPrice)) +
        toSol(
          (numberOfMintsByParentCollectionHolders -
            numberOfMintsByHolderAndUser) *
            Number(publicGroup.mintPrice),
        );
    }
    log('\n');

    console.log(
      '------------- COLLECTION: ',
      cb(collectionData.name),
      '  ---------------',
    );

    log(
      'supply minted: ',
      chb(candyMachine.itemsMinted),
      'supply remaining: ',
      chb(candyMachine.itemsRemaining),
    );

    for (const rarityInfo of itemRarityData) {
      console.log(
        '  ------------   ',
        cerr(rarityInfo.rarity.toString()),
        '  ------------   ',
      );
      console.log('supply minted: ', rarityInfo.minted);
      console.log('supply unwrapped: ', rarityInfo.unwrapped);
      console.log('supply signed: ', rarityInfo.signed);
      console.log('supply left: ', rarityInfo.left);
      console.log('------------------------------------');
    }

    console.log('  ------------  SALE DETAILS --------------  ');
    log(
      'User Minted: ',
      userMints,
      'Generated Revenue: ',
      cg(userMintRevenue),
      ' $SOL',
    );

    log(
      'Public/Non-User Minted:',
      publicMints,
      'Generated Revenue: ',
      cg(publicMintRevenue),
      ' $SOL',
    );

    console.log(
      'New people registered in 1st week:',
      newRegistersIn1WeekOfMint,
    );
    console.log('Number of mints by new registers: ', newRegisteredUserMints);

    if (parentCollection) {
      console.log(
        'Number of mints by parent collection holders: ',
        numberOfMintsByParentCollectionHolders,
      );

      console.log(
        'Number of mints by holders that were also dReader users: ',
        numberOfMintsByHolderAndUser,
      );
      log(
        `Total revenue generated by holders: ${cg(
          totalRevenueGeneratedByHolders,
        )} $SOL`,
      );

      console.log('-----------------------------------');
      log(`TOTAL REVENUE GENERATED: ${cg(totalRevenue)} $SOL`);
      log('\n');
    }
  }
}
