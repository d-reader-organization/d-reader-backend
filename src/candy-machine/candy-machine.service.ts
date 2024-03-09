import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Keypair,
  PublicKey,
  SYSVAR_SLOT_HASHES_PUBKEY,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  Metaplex,
  toBigNumber,
  DefaultCandyGuardSettings,
  CandyMachine,
  getMerkleRoot,
  toDateTime,
  CreateCandyMachineInput,
  WRAPPED_SOL_MINT,
  AllowListGuardSettings,
  isNft,
  RedeemedAmountGuardSettings,
  StartDateGuardSettings,
  EndDateGuardSettings,
  MintLimitGuardSettings,
} from '@metaplex-foundation/js';
import { s3toMxFile } from '../utils/files';
import {
  constructMintCnftTransaction,
  constructMintOneTransaction,
  initializeRecordAuthority,
} from './instructions';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineReceiptParams } from './dto/candy-machine-receipt-params.dto';
import {
  D_PUBLISHER_SYMBOL,
  HUNDRED,
  D_READER_FRONTEND_URL,
  BOT_TAX,
  FREEZE_NFT_DAYS,
  DAY_SECONDS,
  AUTHORITY_GROUP_LABEL,
  PUBLIC_GROUP_LABEL,
  PUBLIC_GROUP_MINT_LIMIT_ID,
  FUNDS_DESTINATION_ADDRESS,
  getRarityShare,
  getRarityShareTable,
} from '../constants';
import {
  doesWalletIndexCorrectly,
  findOurCandyMachine,
  findOwnerByMint,
  sleep,
  solFromLamports,
} from '../utils/helpers';
import { MetdataFile, metaplex, umi, writeFiles } from '../utils/metaplex';
import {
  findDefaultCover,
  getStatefulCoverName,
  validateComicIssueCMInput,
} from '../utils/comic-issue';
import { ComicIssueCMInput } from '../comic-issue/dto/types';
import { GuardGroup, RarityCoverFiles } from '../types/shared';
import {
  generatePropertyName,
  insertItems,
  JsonMetadataCreators,
  uploadCovers,
  validateBalanceForMint,
} from '../utils/candy-machine';
import { DarkblockService } from './darkblock.service';
import { CandyMachineParams } from './dto/candy-machine-params.dto';
import { Prisma, ComicRarity as PrismaComicRarity } from '@prisma/client';
import { CandyMachineGroupSettings, GuardParams } from './dto/types';
import { constructCandyMachineTransaction } from './instructions/initialize-candy-machine';
import { constructThawTransaction } from './instructions/route';
import { createLookupTable } from '../utils/lookup-table';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { createCollectionNft } from './instructions/create-collection';
import { fetchOffChainMetadata } from '../utils/nft-metadata';
import { IndexedNft } from '../wallet/dto/types';
import { ComicRarity } from 'dreader-comic-verse';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { createTreeTransaction } from './instructions/create-tree';
import {
  Creator as UmiCreator,
  MPL_BUBBLEGUM_PROGRAM_ID,
  fetchTreeConfig,
  findTreeConfigPda,
} from '@metaplex-foundation/mpl-bubblegum';
import { random } from 'lodash';

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
    candyMachine: CandyMachine<DefaultCandyGuardSettings>,
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

  async createComicIssueCM(
    comicIssue: ComicIssueCMInput,
    comicName: string,
    onChainName: string,
    guardParams: GuardParams,
    shouldBePublic?: boolean,
    compressed?: boolean,
  ) {
    validateComicIssueCMInput(comicIssue);
    const creatorAddress = comicIssue.creatorAddress;
    const creatorBackupAddress = comicIssue.creatorBackupAddress;
    const royaltyWallets: JsonMetadataCreators = comicIssue.royaltyWallets;

    const { statefulCovers, statelessCovers, rarityCoverFiles } =
      await this.getComicIssueCovers(comicIssue);

    const cover = findDefaultCover(comicIssue.statelessCovers);
    const coverImage = await s3toMxFile(cover.image);

    // if Collection NFT already exists - use it, otherwise create a fresh one
    let collectionNftAddress: PublicKey;
    const collectionNft = await this.prisma.collectionNft.findUnique({
      where: { comicIssueId: comicIssue.id },
    });

    const candyMachineKey = Keypair.generate();

    let darkblockId = '';
    if (collectionNft) {
      collectionNftAddress = new PublicKey(collectionNft.address);
    } else {
      let darkblockMetadataFile: MetdataFile;
      if (comicIssue.pdf) {
        darkblockId = await this.darkblockService.mintDarkblock(
          comicIssue.pdf,
          comicIssue.description,
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
          name: comicIssue.title,
          symbol: D_PUBLISHER_SYMBOL,
          description: comicIssue.description,
          seller_fee_basis_points: comicIssue.sellerFeeBasisPoints,
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

      const newCollectionNft = await createCollectionNft(
        this.metaplex,
        onChainName,
        collectionNftUri,
        comicIssue.sellerFeeBasisPoints,
      );
      await this.prisma.collectionNft.create({
        data: {
          address: newCollectionNft.address.toBase58(),
          name: newCollectionNft.name,
          comicIssue: { connect: { id: comicIssue.id } },
        },
      });
      collectionNftAddress = newCollectionNft.address;
    }

    const creators: CreateCandyMachineInput['creators'] = royaltyWallets.map(
      (wallet) => ({
        address: new PublicKey(wallet.address),
        share: wallet.share,
      }),
    );

    const { startDate, endDate, mintLimit, freezePeriod, mintPrice, supply } =
      guardParams;

    if (compressed) {
      // create merkle tree and store groups in db
      const merkleTreeAddress = await createTreeTransaction(this.umi, supply);
      const lookupTable = await createLookupTable(metaplex, [
        new PublicKey(merkleTreeAddress),
        metaplex.identity().publicKey,
        collectionNftAddress,
        metaplex.programs().getTokenMetadata().address,
        new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID),
      ]);
      const merkleTreeConfigAddress = findTreeConfigPda(umi, {
        merkleTree: merkleTreeAddress,
      });
      const merkleTreeConfig = await fetchTreeConfig(
        umi,
        merkleTreeConfigAddress,
        { commitment: 'confirmed' },
      );

      await this.prisma.candyMachine.create({
        data: {
          address: merkleTreeAddress.toString(),
          mintAuthorityAddress: merkleTreeConfig.treeDelegate.toString(),
          collectionNftAddress: collectionNftAddress.toBase58(),
          authorityPda: merkleTreeConfigAddress.toString(),
          itemsAvailable: Number(merkleTreeConfig.totalMintCapacity),
          itemsMinted: Number(merkleTreeConfig.numMinted),
          itemsRemaining: Number(merkleTreeConfig.totalMintCapacity),
          itemsLoaded: Number(merkleTreeConfig.totalMintCapacity),
          isFullyLoaded: true,
          supply: Number(merkleTreeConfig.totalMintCapacity),
          lookupTable,
          compressed,
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
                  supply: Number(merkleTreeConfig.totalMintCapacity),
                  splTokenAddress: WRAPPED_SOL_MINT.toBase58(),
                },
              }
            : undefined,
        },
      });
      const itemMetadatas = await uploadCovers(
        metaplex,
        comicIssue,
        comicName,
        royaltyWallets,
        statelessCovers.length,
        darkblockId,
        rarityCoverFiles,
      );

      const metadataCreateData = itemMetadatas.map((item) => {
        return {
          uri: item.metadata.uri,
          isUsed: item.isUsed,
          isSigned: item.isSigned,
          rarity: PrismaComicRarity[ComicRarity[item.rarity].toString()],
          collectionName: onChainName,
          collectionAddress: collectionNftAddress.toString(),
        };
      });
      await this.prisma.metadata.createMany({
        data: metadataCreateData,
        skipDuplicates: true,
      });
      this.heliusService.subscribeTo(merkleTreeAddress.toString());
      return merkleTreeAddress;
    }

    await initializeRecordAuthority(
      this.metaplex,
      candyMachineKey.publicKey,
      collectionNftAddress,
      new PublicKey(creatorAddress),
      new PublicKey(creatorBackupAddress),
      supply,
    );

    const groups: {
      label: string;
      guards: Partial<DefaultCandyGuardSettings>;
    }[] = [
      {
        label: AUTHORITY_GROUP_LABEL,
        guards: {
          allowList: {
            merkleRoot: getMerkleRoot([
              this.metaplex.identity().publicKey.toString(),
            ]),
          },
          solPayment: {
            amount: solFromLamports(0),
            destination: FUNDS_DESTINATION_ADDRESS,
          },
        },
      },
    ];

    if (!!shouldBePublic) {
      const paymentGuard = freezePeriod ? 'freezeSolPayment' : 'solPayment';
      groups.push({
        label: PUBLIC_GROUP_LABEL,
        guards: {
          startDate: { date: toDateTime(startDate) },
          endDate: { date: toDateTime(endDate) },
          [paymentGuard]: {
            amount: solFromLamports(mintPrice),
            destination: FUNDS_DESTINATION_ADDRESS,
          },
          mintLimit: mintLimit
            ? {
                id: PUBLIC_GROUP_MINT_LIMIT_ID,
                limit: mintLimit,
              }
            : undefined,
          redeemedAmount: { maximum: toBigNumber(supply) },
        },
      });
    }

    const candyMachineTransaction = await constructCandyMachineTransaction(
      this.metaplex,
      {
        candyMachine: candyMachineKey,
        authority: this.metaplex.identity().publicKey,
        collection: {
          address: collectionNftAddress,
          updateAuthority: this.metaplex.identity(),
        },
        symbol: D_PUBLISHER_SYMBOL,
        maxEditionSupply: toBigNumber(0),
        isMutable: true,
        sellerFeeBasisPoints: comicIssue.sellerFeeBasisPoints,
        itemsAvailable: toBigNumber(supply),
        guards: {
          botTax: {
            lamports: solFromLamports(BOT_TAX),
            lastInstruction: true,
          },
        },
        groups,
        creators: [
          {
            address: this.metaplex.identity().publicKey,
            share: 0,
          },
          ...creators,
        ],
      },
    );

    await sendAndConfirmTransaction(
      metaplex.connection,
      candyMachineTransaction,
      [metaplex.identity(), candyMachineKey],
    );

    let candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress(
        { address: candyMachineKey.publicKey },
        { commitment: 'confirmed' },
      );
    if (freezePeriod) {
      await sleep(1000);
      await this.initializeGuardAccounts(candyMachine, freezePeriod);
    }

    const authorityPda = this.metaplex
      .candyMachines()
      .pdas()
      .authority({ candyMachine: candyMachine.address })
      .toString();

    const lookupTable = await createLookupTable(metaplex, [
      candyMachine.address,
      metaplex.identity().publicKey,
      candyMachine.candyGuard.address,
      collectionNftAddress,
      metaplex.programs().getTokenMetadata().address,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      SYSVAR_SLOT_HASHES_PUBKEY,
    ]);

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
      const metadataCreateData = itemMetadatas.map((item) => ({
        uri: item.metadata.uri,
        isUsed: item.isUsed,
        isSigned: item.isSigned,
        rarity: PrismaComicRarity[ComicRarity[item.rarity].toString()],
        collectionName: onChainName,
        collectionAddress: collectionNftAddress.toString(),
      }));

      await this.prisma.metadata.createMany({
        data: metadataCreateData,
        skipDuplicates: true,
      });
      await sleep(1000); // wait for data to update before refetching candymachine.
    } catch (e) {
      console.error(e);
    }

    candyMachine = await this.metaplex
      .candyMachines()
      .refresh(candyMachine, { commitment: 'confirmed' });
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
        lookupTable,
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
    this.heliusService.subscribeTo(candyMachine.address.toBase58());
    return candyMachine;
  }

  async updateCandyMachine(
    candyMachineAddress: PublicKey,
    groups?: GuardGroup[],
    guards?: Partial<DefaultCandyGuardSettings>,
  ) {
    const candyMachine = await this.metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    await this.metaplex.candyMachines().update({
      candyMachine,
      groups,
      guards,
    });
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

  async createMintCnftTransaction(
    minter: string,
    candyMachineAddress: string,
    collectionAddress: string,
    supply: number,
    mintPrice: number,
  ) {
    //todo: check from helius from last rarity cnft
    let supplyLeft = supply;
    const merkleTreeConfigAddress = findTreeConfigPda(this.umi, {
      merkleTree: publicKey(candyMachineAddress),
    });
    const merkleTreeConfig = await fetchTreeConfig(
      umi,
      merkleTreeConfigAddress,
      { commitment: 'confirmed' },
    );
    const itemsMinted = merkleTreeConfig.numMinted;
    if (itemsMinted >= supply) {
      throw new Error('Maximum items redeemed');
    }
    const mintedItems = await this.prisma.nft.findMany({
      where: { candyMachineAddress },
      include: { metadata: true },
    });

    const itemMetadatas = await this.prisma.metadata.findMany({
      where: { collectionAddress, isUsed: false, isSigned: false },
    });
    const rarityCount = itemMetadatas.length;

    const rarities = getRarityShareTable(rarityCount);
    const compressionData = rarities.map((item, index) => {
      const rarityShare = getRarityShare(rarityCount, item.rarity);
      const raritySupply = Math.floor((supply * rarityShare) / 100);
      if (index != rarities.length - 1) {
        supplyLeft -= raritySupply;
      }
      const rarityItemMinted = mintedItems.filter(
        (rarityItem) => rarityItem.metadata.rarity === item.rarity,
      );
      const countOfRarityItems = rarityItemMinted.length;
      const currentSupply =
        (index == rarities.length - 1 ? supplyLeft : raritySupply) -
        countOfRarityItems;
      return {
        supply: currentSupply,
        rarity: item.rarity,
      };
    });
    console.log(compressionData);

    const randomIndex = random(1, supply - Number(itemsMinted));
    let curr = 0;
    const rarityData = compressionData.find((item) => {
      curr += item.supply;
      if (curr >= randomIndex) return item;
    });

    const itemMetadata = itemMetadatas.find(
      (item) =>
        item.rarity == rarityData.rarity && !item.isSigned && !item.isUsed,
    );

    const { royaltyWallets, ...comicIssue } =
      await this.prisma.comicIssue.findFirst({
        where: { collectionNft: { address: collectionAddress } },
        include: { royaltyWallets: true },
      });

    const { uri, collectionName } = itemMetadata;
    const creators: UmiCreator[] = royaltyWallets.map((wallet) => ({
      address: publicKey(wallet.address),
      verified: false,
      share: wallet.share,
    }));

    return await constructMintCnftTransaction(
      this.umi,
      minter,
      candyMachineAddress,
      collectionAddress,
      collectionName,
      uri,
      mintPrice,
      comicIssue.sellerFeeBasisPoints,
      creators,
    );
  }

  async createMintOneTransaction(
    feePayer: PublicKey,
    candyMachineAddress: PublicKey,
    label: string,
  ) {
    const { allowList, candyMachine, mintPrice } =
      await this.findCandyMachineData(candyMachineAddress.toString(), label);
    const balance = await this.metaplex.connection.getBalance(feePayer);
    validateBalanceForMint(mintPrice, balance);

    const { lookupTable, collectionNftAddress, compressed } = candyMachine;
    const { isEligible } = await this.getMintCount(
      candyMachineAddress.toString(),
      label,
      feePayer.toString(),
    );

    if (!isEligible || feePayer.equals(metaplex.identity().publicKey)) {
      throw new Error('Wallet is not eligible for mint');
    }

    if (compressed) {
      return await this.createMintCnftTransaction(
        feePayer.toString(),
        candyMachineAddress.toString(),
        collectionNftAddress.toString(),
        candyMachine.supply,
        mintPrice,
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
      frozen,
    } = params;
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

    const group: GuardGroup = {
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
    const candyMachinePublicKey = new PublicKey(candyMachineAddress);
    const candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: candyMachinePublicKey });

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

    const allowListGuard: AllowListGuardSettings =
      wallets.length > 0 ? { merkleRoot: getMerkleRoot(wallets) } : null;

    const existingGroup = candyMachine.candyGuard.groups.find(
      (group) => group.label === label,
    );

    const group: GuardGroup = {
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

  async findCandyMachineData(candyMachineAddress: string, label: string) {
    try {
      const data = await this.prisma.candyMachineGroup.findFirst({
        where: { candyMachineAddress, label },
        include: {
          wallets: true,
          candyMachine: true,
        },
      });
      return {
        allowList:
          data.wallets && data.wallets.length
            ? data.wallets.map((item) => item.walletAddress)
            : undefined,
        mintPrice: Number(data.mintPrice),
        candyMachine: data.candyMachine,
      };
    } catch (e) {
      console.error(e);
    }
  }

  async getMintCount(
    candyMachineAddress: string,
    label: string,
    walletAddress?: string,
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
        (!group.mintLimit || receiptsFromBuyer.length < group.mintLimit);
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
    await this.metaplex.candyMachines().delete({ candyMachine: address });
  }
}
