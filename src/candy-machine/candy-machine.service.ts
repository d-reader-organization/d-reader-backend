import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  Metaplex,
  toBigNumber,
  DefaultCandyGuardSettings,
  CandyMachine as LegacyCandyMachine,
  getMerkleRoot,
  toDateTime,
  WRAPPED_SOL_MINT,
  AllowListGuardSettings,
  isNft,
  RedeemedAmountGuardSettings,
  StartDateGuardSettings,
  EndDateGuardSettings,
  MintLimitGuardSettings,
  MetaplexFile,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import {
  constructCoreMintTransaction,
  constructMintOneTransaction,
} from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import {
  D_PUBLISHER_SYMBOL,
  HUNDRED,
  D_READER_FRONTEND_URL,
  FREEZE_NFT_DAYS,
  DAY_SECONDS,
  AUTHORITY_GROUP_LABEL,
  PUBLIC_GROUP_LABEL,
  FUNDS_DESTINATION_ADDRESS,
  MIN_COMPUTE_PRICE_IX,
  MIN_COMPUTE_PRICE,
} from '../constants';
import {
  doesWalletIndexCorrectly,
  findOurCandyMachine,
  findOwnerByMint,
  sleep,
  solFromLamports,
} from '../utils/helpers';
import {
  MetdataFile,
  getThirdPartySigner,
  metaplex,
  umi,
  writeFiles,
} from '../utils/metaplex';
import {
  findDefaultCover,
  getStatefulCoverName,
  validateComicIssueCMInput,
} from '../utils/comic-issue';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { LegacyGuardGroup, RarityCoverFiles } from '../types/shared';
import {
  generatePropertyName,
  insertItems,
  JsonMetadataCreators,
  validateBalanceForMint,
} from '../utils/candy-machine';
import { DarkblockService } from './darkblock.service';
import { CandyMachineParams } from './dto/candy-machine-params.dto';
import {
  Prisma,
  TokenStandard,
  ComicRarity as PrismaComicRarity,
} from '@prisma/client';
import { CandyMachineGroupSettings, GuardParams } from './dto/types';
import { ComicRarity } from 'dreader-comic-verse';
import {
  createCoreCandyMachine,
  createLegacyCandyMachine,
} from './instructions/initialize-candy-machine';
import { constructThawTransaction } from './instructions/route';
import { createCollectionNft } from './instructions/create-collection';
import { fetchOffChainMetadata } from '../utils/nft-metadata';
import { IndexedNft } from '../wallet/dto/types';
import {
  Umi,
  generateSigner,
  publicKey,
  PublicKey as UmiPublicKey,
  transactionBuilder,
  some,
  lamports as umiLamports,
  dateTime as umiDateTime,
  none,
  createBigInt,
  Option,
} from '@metaplex-foundation/umi';
import {
  fetchCandyMachine,
  findCandyMachineAuthorityPda,
  CandyMachine as CoreCandyMachine,
  updateCandyGuard,
  DefaultGuardSetArgs,
  fetchCandyGuard,
  getMerkleRoot as getCoreMekleRoot,
  DefaultGuardSet,
  RedeemedAmount,
  StartDate,
  EndDate,
  GuardGroup as CoreGuardGroup,
  AllowList,
  ThirdPartySigner,
} from '@metaplex-foundation/mpl-core-candy-machine';
import {
  createCollectionV1,
  pluginAuthorityPair,
  ruleSet,
} from '@metaplex-foundation/mpl-core';
import { insertCoreItems } from '../utils/core-candy-machine';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { MintLimit } from '@metaplex-foundation/mpl-candy-guard';
import { base58 } from '@metaplex-foundation/umi/serializers';
import {
  deleteCoreCandyMachine,
  deleteLegacyCandyMachine,
} from './instructions/delete-candy-machine';

@Injectable()
export class CandyMachineService {
  private readonly metaplex: Metaplex;
  private readonly umi: Umi;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
    private readonly darkblockService: DarkblockService,
  ) {
    this.metaplex = metaplex;
    this.umi = umi;
  }

  async getComicIssueCovers(comicIssue: ComicIssueCMInput) {
    const statelessCoverPromises = comicIssue.statelessCovers.map((cover) =>
      s3toMxFile(cover.image),
    );
    const statelessCovers = await Promise.all(statelessCoverPromises);

    const rarityCoverFiles: RarityCoverFiles = {} as RarityCoverFiles;
    const statefulCoverPromises = comicIssue.statefulCovers.map(
      async (cover) => {
        const file = await s3toMxFile(cover.image, getStatefulCoverName(cover));
        const property = generatePropertyName(cover.isUsed, cover.isSigned);
        const value = {
          ...rarityCoverFiles[cover.rarity],
          [property]: file,
        };
        rarityCoverFiles[cover.rarity] = value;
        return file;
      },
    );
    const statefulCovers = await Promise.all(statefulCoverPromises);

    return { statefulCovers, statelessCovers, rarityCoverFiles };
  }

  async initializeGuardAccounts(
    candyMachine: LegacyCandyMachine<DefaultCandyGuardSettings>,
    freezePeriod?: number,
  ) {
    await this.metaplex.candyMachines().callGuardRoute({
      candyMachine,
      guard: 'freezeSolPayment',
      settings: {
        path: 'initialize',
        period: (freezePeriod ?? FREEZE_NFT_DAYS) * DAY_SECONDS,
        candyGuardAuthority: this.metaplex.identity(),
      },
      group: PUBLIC_GROUP_LABEL,
    });
  }

  async getOrCreateComicIssueCollection(
    comicIssue: ComicIssueCMInput,
    onChainName: string,
    royaltyWallets: JsonMetadataCreators,
    statelessCovers: MetaplexFile[],
    statefulCovers: MetaplexFile[],
    tokenStandard?: TokenStandard,
  ) {
    const {
      pdf,
      id: comicIssueId,
      description,
      creatorAddress,
      title,
      sellerFeeBasisPoints,
    } = comicIssue;

    const cover = findDefaultCover(comicIssue.statelessCovers);
    const coverImage = await s3toMxFile(cover.image);
    // if Collection NFT already exists - use it, otherwise create a fresh one
    let collectionNftAddress: PublicKey;
    const collectionNft = await this.prisma.collectionNft.findUnique({
      where: {
        comicIssueId,
        candyMachines: { some: { standard: tokenStandard } },
      },
    });

    let darkblockId = '';
    // Core standard doesn't allow same collection to be expanded in supply as of now so candymachine create will fail if used old collection
    if (collectionNft && tokenStandard !== TokenStandard.Core) {
      collectionNftAddress = new PublicKey(collectionNft.address);
      darkblockId = collectionNft.darkblockId ?? '';
    } else {
      let darkblockMetadataFile: MetdataFile;
      if (pdf) {
        darkblockId = await this.darkblockService.mintDarkblock(
          pdf,
          description,
          creatorAddress,
        );
        darkblockMetadataFile = {
          type: 'Darkblock',
          uri: darkblockId,
        };
      }

      const { uri: collectionNftUri } = await this.metaplex
        .nfts()
        .uploadMetadata({
          name: title,
          symbol: D_PUBLISHER_SYMBOL,
          description: description,
          seller_fee_basis_points: sellerFeeBasisPoints,
          image: coverImage,
          external_url: D_READER_FRONTEND_URL,
          properties: {
            creators: [
              {
                address: this.metaplex.identity().publicKey.toBase58(),
                share: HUNDRED,
              },
            ],
            files: [
              ...writeFiles(coverImage, ...statefulCovers, ...statelessCovers),
              ...(darkblockMetadataFile ? [darkblockMetadataFile] : []),
            ],
          },
        });

      if (tokenStandard === TokenStandard.Core) {
        const collection = generateSigner(umi);
        const creators = royaltyWallets.map((item) => {
          return {
            address: publicKey(item.address),
            percentage: item.share,
          };
        });

        const collectionBuilder = createCollectionV1(umi, {
          collection,
          uri: collectionNftUri,
          name: onChainName,
          plugins: [
            pluginAuthorityPair({
              type: 'Royalties',
              data: {
                basisPoints: sellerFeeBasisPoints,
                creators,
                // Change in future if encounters with a marketplace not enforcing royalties
                ruleSet: ruleSet('None'),
              },
            }),
          ],
        });

        await collectionBuilder.sendAndConfirm(umi, {
          send: { commitment: 'confirmed' },
        });

        console.log(`Collection: ${collection.publicKey.toString()}`);
        collectionNftAddress = new PublicKey(collection.publicKey);
      } else {
        const newCollectionNft = await createCollectionNft(
          this.metaplex,
          onChainName,
          collectionNftUri,
          sellerFeeBasisPoints,
        );
        collectionNftAddress = newCollectionNft.address;
      }

      await this.prisma.collectionNft.create({
        data: {
          address: collectionNftAddress.toBase58(),
          name: onChainName,
          comicIssue: { connect: { id: comicIssue.id } },
        },
      });
    }
    return { collectionNftAddress, darkblockId };
  }

  async createComicIssueCM({
    comicIssue,
    comicName,
    onChainName,
    guardParams,
    shouldBePublic,
    tokenStandard,
  }: {
    comicIssue: ComicIssueCMInput;
    comicName: string;
    onChainName: string;
    guardParams: GuardParams;
    shouldBePublic?: boolean;
    tokenStandard?: TokenStandard;
  }) {
    validateComicIssueCMInput(comicIssue);
    const royaltyWallets: JsonMetadataCreators = comicIssue.royaltyWallets;

    const { statefulCovers, statelessCovers, rarityCoverFiles } =
      await this.getComicIssueCovers(comicIssue);

    const { collectionNftAddress, darkblockId } =
      await this.getOrCreateComicIssueCollection(
        comicIssue,
        onChainName,
        royaltyWallets,
        statelessCovers,
        statefulCovers,
        tokenStandard,
      );

    const { startDate, endDate, mintLimit, freezePeriod, mintPrice, supply } =
      guardParams;

    let candyMachine: LegacyCandyMachine | CoreCandyMachine;
    let candyMachineAddress: string;
    if (tokenStandard === TokenStandard.Core) {
      console.log('Create Core Candy Machine');
      const [candyMachinePubkey, lut] = await createCoreCandyMachine(
        this.umi,
        publicKey(collectionNftAddress),
        comicIssue,
        royaltyWallets,
        guardParams,
        !!shouldBePublic,
      );
      const candyMachine = await fetchCandyMachine(umi, candyMachinePubkey, {
        commitment: 'confirmed',
      });
      await this.prisma.candyMachine.create({
        data: {
          address: candyMachine.publicKey.toString(),
          mintAuthorityAddress: candyMachine.mintAuthority.toString(),
          collectionNftAddress: candyMachine.collectionMint.toString(),
          authorityPda: findCandyMachineAuthorityPda(umi, {
            candyMachine: candyMachine.publicKey,
          }).toString(),
          itemsAvailable: Number(candyMachine.data.itemsAvailable),
          itemsMinted: Number(candyMachine.itemsRedeemed),
          itemsRemaining: Number(candyMachine.data.itemsAvailable),
          itemsLoaded: candyMachine.itemsLoaded,
          isFullyLoaded: true,
          supply,
          standard: TokenStandard.Core,
          lookupTable: lut ? lut.toString() : undefined,
          groups: !!shouldBePublic
            ? {
                create: {
                  displayLabel: PUBLIC_GROUP_LABEL,
                  wallets: undefined,
                  label: PUBLIC_GROUP_LABEL,
                  startDate,
                  endDate,
                  mintPrice: mintPrice,
                  mintLimit,
                  supply,
                  splTokenAddress: WRAPPED_SOL_MINT.toBase58(),
                },
              }
            : undefined,
        },
      });

      try {
        const itemMetadatas = await insertCoreItems(
          this.umi,
          this.metaplex,
          candyMachine.publicKey,
          comicIssue,
          publicKey(collectionNftAddress),
          comicName,
          royaltyWallets,
          statelessCovers,
          darkblockId,
          supply,
          onChainName,
          rarityCoverFiles,
        );

        const metadataCreateData = itemMetadatas.map((item) => {
          return {
            uri: item.metadata.uri,
            isUsed: item.isUsed,
            isSigned: item.isSigned,
            rarity: PrismaComicRarity[ComicRarity[item.rarity].toString()],
            collectionName: onChainName,
          };
        });

        await this.prisma.metadata.createMany({
          data: metadataCreateData,
          skipDuplicates: true,
        });
        const updatedCandyMachine = await fetchCandyMachine(
          umi,
          candyMachinePubkey,
          {
            commitment: 'confirmed',
          },
        );

        await this.prisma.candyMachine.update({
          where: { address: candyMachine.publicKey.toString() },
          data: { itemsLoaded: updatedCandyMachine.itemsLoaded },
        });
      } catch (e) {
        console.error(`Failed to insert items: `, e);
      }

      candyMachineAddress = candyMachine.publicKey.toString();
    } else {
      console.log('Create Legacy Candy Machine');

      const [candyMachinePubkey, lut] = await createLegacyCandyMachine(
        this.metaplex,
        collectionNftAddress,
        comicIssue,
        royaltyWallets,
        guardParams,
        !!shouldBePublic,
      );

      let candyMachine = await this.metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePubkey });

      if (freezePeriod) {
        await sleep(1000);
        await this.initializeGuardAccounts(candyMachine, freezePeriod);
      }

      const authorityPda = this.metaplex
        .candyMachines()
        .pdas()
        .authority({ candyMachine: candyMachine.address })
        .toString();

      try {
        const itemMetadatas = await insertItems(
          this.metaplex,
          candyMachine,
          comicIssue,
          collectionNftAddress,
          comicName,
          royaltyWallets,
          statelessCovers,
          darkblockId,
          supply,
          onChainName,
          rarityCoverFiles,
        );
        const metadataCreateData = itemMetadatas.map((item) => {
          return {
            uri: item.metadata.uri,
            isUsed: item.isUsed,
            isSigned: item.isSigned,
            rarity: PrismaComicRarity[ComicRarity[item.rarity].toString()],
            collectionName: onChainName,
          };
        });

        await this.prisma.metadata.createMany({
          data: metadataCreateData,
          skipDuplicates: true,
        });
        await sleep(1000); // wait for data to update before refetching candymachine.
      } catch (e) {
        console.error(e);
      }

      candyMachine = await this.metaplex.candyMachines().refresh(candyMachine);
      await this.prisma.candyMachine.create({
        data: {
          address: candyMachine.address.toBase58(),
          mintAuthorityAddress: candyMachine.mintAuthorityAddress.toBase58(),
          collectionNftAddress: candyMachine.collectionMintAddress.toBase58(),
          authorityPda,
          itemsAvailable: candyMachine.itemsAvailable.toNumber(),
          itemsMinted: candyMachine.itemsMinted.toNumber(),
          itemsRemaining: candyMachine.itemsRemaining.toNumber(),
          itemsLoaded: candyMachine.itemsLoaded,
          isFullyLoaded: candyMachine.isFullyLoaded,
          supply,
          lookupTable: lut.toString(),
          standard: tokenStandard,
          groups: !!shouldBePublic
            ? {
                create: {
                  displayLabel: PUBLIC_GROUP_LABEL,
                  wallets: undefined,
                  label: PUBLIC_GROUP_LABEL,
                  startDate,
                  endDate,
                  mintPrice: mintPrice,
                  mintLimit,
                  supply,
                  splTokenAddress: WRAPPED_SOL_MINT.toBase58(),
                },
              }
            : undefined,
        },
      });
      candyMachineAddress = candyMachine.address.toBase58();
    }

    this.heliusService.subscribeTo(candyMachineAddress);
    return candyMachine;
  }

  async updateCoreCandyMachine(
    candMachineAddress: UmiPublicKey,
    groups: CoreGuardGroup<DefaultGuardSet>[],
    guards: Partial<DefaultGuardSetArgs>,
  ) {
    try {
      const candyMachine = await fetchCandyMachine(
        this.umi,
        candMachineAddress,
      );
      const updateBuilder = updateCandyGuard(this.umi, {
        groups,
        guards,
        candyGuard: candyMachine.mintAuthority,
      });
      const builder = transactionBuilder()
        .add(
          setComputeUnitPrice(this.umi, { microLamports: MIN_COMPUTE_PRICE }),
        )
        .add(updateBuilder);
      const response = await builder.sendAndConfirm(this.umi, {
        send: { commitment: 'confirmed' },
      });
      const signature = base58.deserialize(response.signature);
      console.log(`CandyMachine updated : ${signature}`);
    } catch (e) {
      console.error(
        `Error updating CandyMachine ${candMachineAddress.toString()}`,
        e,
      );
    }
  }

  async updateCandyMachine(
    candyMachineAddress: PublicKey,
    groups?: LegacyGuardGroup[],
    guards?: Partial<DefaultCandyGuardSettings>,
  ) {
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    const builder = this.metaplex.candyMachines().builders().update({
      candyMachine,
      groups,
      guards,
    });
    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash({
      commitment: 'confirmed',
    });
    const transaction = new Transaction({
      feePayer: this.metaplex.identity().publicKey,
      ...latestBlockhash,
    }).add(MIN_COMPUTE_PRICE_IX, builder.toTransaction(latestBlockhash));

    const signature = await sendAndConfirmTransaction(
      this.metaplex.connection,
      transaction,
      [this.metaplex.identity()],
      { commitment: 'confirmed' },
    );
    console.log(`CandyMachine updated : ${signature}`);
  }

  async createMintTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
    label: string,
    mintCount?: number,
  ) {
    const transactions: Promise<string[]>[] = [];
    for (let i = 0; i < mintCount; i++) {
      transactions.push(
        this.createMintOneTransaction(feePayer, candyMachineAddress, label),
      );
    }
    return await Promise.all(transactions);
  }

  async createMintOneTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
    label: string,
  ) {
    const { allowList, lookupTable, mintPrice, tokenStandard } =
      await this.findCandyMachineData(candyMachineAddress.toString(), label);
    const balance = await this.metaplex.connection.getBalance(feePayer);
    validateBalanceForMint(mintPrice, balance, tokenStandard);

    if (tokenStandard === TokenStandard.Core) {
      // TODO: pass thirdparty sign as per config
      return await constructCoreMintTransaction(
        this.umi,
        publicKey(candyMachineAddress),
        publicKey(feePayer),
        label,
        allowList,
        lookupTable,
      );
    }

    return await constructMintOneTransaction(
      this.metaplex,
      feePayer,
      candyMachineAddress,
      label,
      allowList,
      lookupTable,
    );
  }

  async thawFrozenNft(
    candyMachineAddress: PublicKey,
    nftMint: PublicKey,
    nftOwner: PublicKey,
    guard: string,
    label: string,
  ) {
    if (label === AUTHORITY_GROUP_LABEL) return;
    try {
      const transaction = await constructThawTransaction(
        this.metaplex,
        candyMachineAddress,
        nftMint,
        nftOwner,
        guard,
        label,
      );
      console.log(`Thaw in process : ${nftMint.toString()}`);
      return await sendAndConfirmTransaction(
        this.metaplex.connection,
        transaction,
        [this.metaplex.identity()],
      );
    } catch (e) {
      console.log(`${nftMint} failed to thawed`);
      console.error(e);
    }
  }

  async unlockFunds(
    candyMachineAddress: PublicKey,
    guard: string,
    group: string,
  ) {
    try {
      const candyMachine = await this.metaplex
        .candyMachines()
        .findByAddress({ address: candyMachineAddress });
      await this.metaplex.candyMachines().callGuardRoute({
        candyMachine,
        guard,
        group,
        settings: {
          path: 'unlockFunds',
          candyGuardAuthority: this.metaplex.identity(),
        },
      });
      console.log(`Funds unlocked: ${group}`);
    } catch (e) {
      console.error(e);
    }
  }

  async find(query: CandyMachineParams) {
    const address = query.candyMachineAddress;
    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address },
      include: { groups: true },
    });
    if (!candyMachine) {
      throw new NotFoundException(
        `Candy Machine with address ${address} does not exist`,
      );
    }

    const groups: CandyMachineGroupSettings[] = await Promise.all(
      candyMachine.groups.map(
        async (group): Promise<CandyMachineGroupSettings> => {
          const { displayLabel, isEligible, walletItemsMinted } =
            await this.getMintCount(
              query.candyMachineAddress,
              group.label,
              query.walletAddress,
              group.mintLimit,
            );
          return {
            ...group,
            mintPrice: Number(group.mintPrice),
            itemsMinted: candyMachine.itemsMinted,
            displayLabel,
            walletStats: {
              isEligible,
              itemsMinted: walletItemsMinted,
            },
          };
        },
      ),
    );
    return { ...candyMachine, groups };
  }

  async findReceipts(query: CandyMachineReceiptParams) {
    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: { candyMachineAddress: query.candyMachineAddress },
      include: { nft: true, buyer: { include: { user: true } } },
      orderBy: { timestamp: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return receipts;
  }

  async addLegacyCandyMachineGroupOnChain(
    candyMachineAddress: string,
    params: GuardParams,
  ) {
    const { label, startDate, endDate, mintPrice, mintLimit, supply, frozen } =
      params;
    const candyMachinePublicKey = new PublicKey(candyMachineAddress);
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachinePublicKey });
    const candyMachineGroups = candyMachine.candyGuard.groups;

    const redeemedAmountGuard: RedeemedAmountGuardSettings = {
      maximum: toBigNumber(supply),
    };
    let startDateGuard: StartDateGuardSettings;
    if (startDate) startDateGuard = { date: toDateTime(startDate) };

    let endDateGuard: EndDateGuardSettings;
    if (endDate) endDateGuard = { date: toDateTime(endDate) };

    let mintLimitGuard: MintLimitGuardSettings;
    if (mintLimit)
      mintLimitGuard = { id: candyMachineGroups.length, limit: mintLimit };

    const paymentGuard = frozen ? 'freezeSolPayment' : 'solPayment';
    const existingGroup = candyMachineGroups.find(
      (group) => group.label === label,
    );

    if (existingGroup) {
      throw new Error(`A group with label ${label} already exists`);
    }

    const group: LegacyGuardGroup = {
      label,
      guards: {
        ...candyMachine.candyGuard.guards,
        [paymentGuard]: {
          amount: solFromLamports(mintPrice),
          destination: FUNDS_DESTINATION_ADDRESS,
        },
        redeemedAmount: redeemedAmountGuard,
        startDate: startDateGuard,
        endDate: endDateGuard,
        mintLimit: mintLimitGuard,
      },
    };
    const resolvedGroups = candyMachineGroups.filter(
      (group) => group.label != label,
    );

    const groups = [...resolvedGroups, group];
    await this.updateCandyMachine(candyMachinePublicKey, groups);
  }

  async addCoreCandyMachineGroupOnChain(
    candyMachineAddress: string,
    params: GuardParams,
  ) {
    const {
      label,
      startDate,
      endDate,
      mintPrice,
      mintLimit,
      supply,
      frozen,
      thirdPartySign,
    } = params;

    const candyMachine = await fetchCandyMachine(
      this.umi,
      publicKey(candyMachineAddress),
    );
    const candyGuard = await fetchCandyGuard(
      this.umi,
      candyMachine.mintAuthority,
    );

    const candyMachineGroups = candyGuard.groups;
    const redeemedAmountGuard: RedeemedAmount = {
      maximum: createBigInt(supply),
    };
    let startDateGuard: StartDate;
    if (startDate) startDateGuard = { date: umiDateTime(startDate) };

    let endDateGuard: EndDate;
    if (endDate) endDateGuard = { date: umiDateTime(endDate) };

    let mintLimitGuard: MintLimit;
    if (mintLimit)
      mintLimitGuard = { id: candyMachineGroups.length, limit: mintLimit };

    let thirdPartySignerGuard: ThirdPartySigner;
    if (thirdPartySign) {
      const thirdPartySigner = getThirdPartySigner();
      thirdPartySignerGuard = { signerKey: publicKey(thirdPartySigner) };
    }

    const paymentGuard = frozen ? 'freezeSolPayment' : 'solPayment';
    const existingGroup = candyMachineGroups.find(
      (group) => group.label === label,
    );

    if (existingGroup) {
      throw new Error(`A group with label ${label} already exists`);
    }

    const group: CoreGuardGroup<DefaultGuardSet> = {
      label,
      guards: {
        ...candyGuard.guards,
        [paymentGuard]: some({
          lamports: umiLamports(mintPrice),
          destination: publicKey(FUNDS_DESTINATION_ADDRESS),
        }),
        redeemedAmount: some(redeemedAmountGuard),
        startDate: startDate ? some(startDateGuard) : none(),
        endDate: endDate ? some(endDateGuard) : none(),
        mintLimit: mintLimitGuard ? some(mintLimitGuard) : none(),
        thirdPartySigner: thirdPartySign ? some(thirdPartySignerGuard) : none(),
      },
    };
    const resolvedGroups = candyMachineGroups.filter(
      (group) => group.label != label,
    );
    resolvedGroups.push(group);
    await this.updateCoreCandyMachine(
      publicKey(candyMachineAddress),
      resolvedGroups,
      candyGuard.guards,
    );
  }

  async addCandyMachineGroup(candyMachineAddress: string, params: GuardParams) {
    const {
      displayLabel,
      label,
      startDate,
      endDate,
      splTokenAddress,
      mintPrice,
      mintLimit,
      supply,
    } = params;
    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address: candyMachineAddress },
    });
    if (candyMachine.standard == TokenStandard.Legacy) {
      await this.addLegacyCandyMachineGroupOnChain(candyMachineAddress, params);
    } else {
      await this.addCoreCandyMachineGroupOnChain(candyMachineAddress, params);
    }

    await this.prisma.candyMachineGroup.create({
      data: {
        candyMachine: {
          connect: {
            address: candyMachineAddress,
          },
        },
        displayLabel,
        wallets: undefined,
        label,
        startDate,
        endDate,
        splTokenAddress,
        mintPrice,
        mintLimit,
        supply,
      },
    });
  }

  async findActiveRewardCandyMachine(label: string) {
    const candyMachines = await this.prisma.candyMachineGroup.findMany({
      where: {
        label,
        candyMachine: { itemsRemaining: { gt: 0 } },
      },
    });
    return candyMachines;
  }

  async addAllowList(
    candyMachineAddress: string,
    allowList: string[],
    label: string,
  ) {
    console.log('finding the already allowlist in db');
    const alreadyAllowlistedWallets = await this.prisma.wallet.findMany({
      where: {
        candyMachineGroups: {
          some: { candyMachineGroup: { label, candyMachineAddress } },
        },
      },
    });

    const allowlistedWallets = alreadyAllowlistedWallets.map((w) => w.address);
    const filteredAllowlist = allowList.filter(
      (address) => !allowlistedWallets.includes(address),
    );

    console.log('Adding allowlist in database');
    const wallets = await this.prisma.candyMachineGroup
      .update({
        where: { label_candyMachineAddress: { label, candyMachineAddress } },
        data: {
          wallets: {
            create: filteredAllowlist.map((address) => ({
              wallet: {
                connectOrCreate: {
                  where: { address },
                  create: { address },
                },
              },
            })),
          },
        },
        include: { wallets: true },
      })
      .then((values) => values.wallets.map((wallet) => wallet.walletAddress));

    const candyMachineData = await this.prisma.candyMachine.findFirst({
      where: { address: candyMachineAddress },
    });

    if (candyMachineData.standard === TokenStandard.Core) {
      const candyGuard = await fetchCandyGuard(
        this.umi,
        publicKey(candyMachineData.mintAuthorityAddress),
      );
      const allowListGuard: Option<AllowList> =
        wallets.length > 0
          ? some({
              merkleRoot: getCoreMekleRoot(wallets),
            })
          : none();
      const existingGroup = candyGuard.groups.find(
        (group) => group.label === label,
      );
      const group: CoreGuardGroup<DefaultGuardSet> = {
        label,
        guards: {
          ...existingGroup.guards,
          allowList: allowListGuard,
        },
      };
      const resolvedGroups = candyGuard.groups.filter(
        (group) => group.label != label,
      );
      const groups = [...resolvedGroups, group];
      console.log('Updating the candymachine with allowlist');
      await this.updateCoreCandyMachine(
        publicKey(candyMachineAddress),
        groups,
        candyGuard.guards,
      );
    } else {
      const candyMachinePublicKey = new PublicKey(candyMachineAddress);
      const candyMachine = await metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePublicKey });

      const allowListGuard: AllowListGuardSettings =
        wallets.length > 0 ? { merkleRoot: getMerkleRoot(wallets) } : null;

      const existingGroup = candyMachine.candyGuard.groups.find(
        (group) => group.label === label,
      );

      const group: LegacyGuardGroup = {
        label,
        guards: { ...existingGroup.guards, allowList: allowListGuard },
      };

      const resolvedGroups = candyMachine.candyGuard.groups.filter(
        (group) => group.label != label,
      );

      const groups = [...resolvedGroups, group];
      console.log('Updating the candymachine with allowlist');
      await this.updateCandyMachine(candyMachinePublicKey, groups);
    }
  }

  async findCandyMachineData(candyMachineAddress: string, label: string) {
    try {
      const data = await this.prisma.candyMachineGroup.findFirst({
        where: { candyMachineAddress, label },
        include: { wallets: true, candyMachine: true },
      });
      return {
        allowList:
          data.wallets && data.wallets.length
            ? data.wallets.map((item) => item.walletAddress)
            : undefined,
        lookupTable: data.candyMachine.lookupTable,
        mintPrice: Number(data.mintPrice),
        tokenStandard: data.candyMachine.standard,
      };
    } catch (e) {
      console.error(e);
    }
  }

  async getMintCount(
    candyMachineAddress: string,
    label: string,
    walletAddress?: string,
    mintLimit?: number,
  ): Promise<{
    displayLabel: string;
    isEligible: boolean;
    walletItemsMinted?: number;
  }> {
    let receiptsFromBuyer: Prisma.CandyMachineReceiptCreateManyCandyMachineInput[];

    if (walletAddress) {
      receiptsFromBuyer = await this.prisma.candyMachineReceipt.findMany({
        where: { candyMachineAddress, label, buyerAddress: walletAddress },
      });
    }
    let isEligible = !!walletAddress;
    const group = await this.prisma.candyMachineGroup.findFirst({
      where: { candyMachineAddress, label },
      include: { wallets: true },
    });

    if (walletAddress) {
      isEligible =
        (!group.hasAllowList ||
          group.wallets.some(
            (groupWallet) => groupWallet.walletAddress === walletAddress,
          )) &&
        (!mintLimit || receiptsFromBuyer.length < mintLimit);
    }

    return {
      walletItemsMinted: receiptsFromBuyer?.length,
      displayLabel: group.displayLabel,
      isEligible,
    };
  }

  async syncCollection(nfts: string[]) {
    const onChainNfts = (
      await Promise.all(
        nfts.map((mint: string) => {
          return this.metaplex
            .nfts()
            .findByMint({ mintAddress: new PublicKey(mint) });
        }),
      )
    ).filter(isNft);

    const candyMachines = await this.prisma.candyMachine.findMany({
      select: { address: true },
    });

    const unsyncedNfts = (
      await Promise.all(
        onChainNfts.map(async (nft) => {
          const candyMachineAddress = findOurCandyMachine(
            this.metaplex,
            candyMachines,
            nft,
          );
          if (candyMachineAddress) {
            const isIndexed = await doesWalletIndexCorrectly(
              nft,
              nfts,
              candyMachineAddress,
            );
            if (!isIndexed) {
              return nft;
            }
            return nft;
          }
        }),
      )
    ).filter(Boolean);

    for await (const unSyncedNft of unsyncedNfts) {
      try {
        const collectionMetadata = await fetchOffChainMetadata(unSyncedNft.uri);

        const nft = await this.prisma.nft.findFirst({
          where: { address: unSyncedNft.address.toString() },
        });
        const candyMachine = findOurCandyMachine(
          this.metaplex,
          candyMachines,
          unSyncedNft,
        );

        const owner = await findOwnerByMint(
          metaplex.connection,
          unSyncedNft.address,
        );

        let indexedNft: IndexedNft;
        if (nft) {
          indexedNft = await this.heliusService.reindexNft(
            unSyncedNft,
            collectionMetadata,
            owner,
            candyMachine,
          );
        } else {
          indexedNft = await this.heliusService.indexNft(
            unSyncedNft,
            collectionMetadata,
            owner,
            candyMachine,
          );
        }
        const doesReceiptExists =
          await this.prisma.candyMachineReceipt.findFirst({
            where: { nftAddress: indexedNft.address },
          });

        if (!doesReceiptExists) {
          const UNKNOWN = 'UNKNOWN';
          const userId: number = indexedNft.owner?.userId;

          const receiptData: Prisma.CandyMachineReceiptCreateInput = {
            nft: { connect: { address: indexedNft.address } },
            candyMachine: { connect: { address: candyMachine } },
            buyer: {
              connectOrCreate: {
                where: { address: indexedNft.ownerAddress },
                create: { address: indexedNft.ownerAddress },
              },
            },
            price: 0,
            timestamp: new Date(),
            description: `${indexedNft.address} minted ${unSyncedNft.name} for ${UNKNOWN} SOL.`,
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
        }
      } catch (e) {
        console.error(`Error syncing nft ${unSyncedNft.address}`);
      }
    }
  }

  async deleteCandyMachine(address: PublicKey) {
    const { standard, mintAuthorityAddress } =
      await this.prisma.candyMachine.findUnique({
        where: { address: address.toString() },
      });
    if (standard === TokenStandard.Core) {
      return deleteCoreCandyMachine(
        this.umi,
        publicKey(address),
        publicKey(mintAuthorityAddress),
      );
    } else {
      return deleteLegacyCandyMachine(this.metaplex, address);
    }
  }
}
