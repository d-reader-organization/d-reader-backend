import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ComicIssueService } from '../comic-issue/comic-issue.service';
import { ActionSpecGetResponse, LinkedAction } from './dto/types';
import { s3Service } from '../aws/s3.service';
import { Comic, ComicIssue, CouponType, StatelessCover } from '@prisma/client';
import { isNumberString } from 'class-validator';
import { SOL_ADDRESS } from '../constants';
import { toSol } from '../utils/helpers';
import { TransactionService } from '../transactions/transaction.service';
import { ComicStateArgs } from 'dreader-comic-verse';
import { PublicKey } from '@solana/web3.js';
import { fetchOffChainMetadata } from '../utils/nft-metadata';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { publicKey } from '@metaplex-foundation/umi';
import { PublicKey as UmiPublicKey } from '@metaplex-foundation/umi';
@Injectable()
export class BlinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comicIssueService: ComicIssueService,
    private readonly candyMachineService: CandyMachineService,
    private readonly s3: s3Service,
    private readonly transactionService: TransactionService,
  ) {}

  async getMintActionSpec(id: string): Promise<ActionSpecGetResponse> {
    const isIssueId = isNumberString(id);

    let data: ComicIssue & { comic: Comic; statelessCovers: StatelessCover[] };
    if (isIssueId) {
      data = await this.prisma.comicIssue.findUnique({
        where: { id: +id },
        include: { statelessCovers: true, comic: true },
      });
    } else {
      const key = id.split('_');
      const [comicSlug, slug] = key;

      data = await this.prisma.comicIssue.findFirst({
        where: { comicSlug, slug },
        include: { statelessCovers: true, comic: true },
      });
    }

    const { comic, statelessCovers, ...comicIssue } = data;
    if (!comicIssue) {
      throw new Error('No such comic issue exists');
    }
    const activeCandyMachine =
      await this.comicIssueService.findActiveCandyMachine(comicIssue.id);

    if (!activeCandyMachine) {
      throw new Error('No active mint for this issue');
    }

    const publicCouponCurrecySetting =
      await this.prisma.candyMachineCouponCurrencySetting.findFirst({
        where: {
          coupon: {
            candyMachineAddress: activeCandyMachine.address,
            type: CouponType.PublicUser,
          },
          splTokenAddress: SOL_ADDRESS,
        },
      });

    const defaultCover = statelessCovers.find((cover) => cover.isDefault);
    const actionEndpoint = `${process.env.API_URL}/transaction/blink/mint/${publicCouponCurrecySetting.couponId}`;
    const mintPrice = toSol(Number(publicCouponCurrecySetting.mintPrice));

    return {
      icon: this.s3.getPublicUrl(defaultCover.image),
      title: `${comic.title} - ${comicIssue.title}`,
      description: comicIssue.description,
      label: 'Mint',
      links: {
        actions: [
          { label: `Mint for ~ ${mintPrice} SOL`, href: actionEndpoint },
        ],
      },
    };
  }

  async getComicSignActionSpec(
    address: string,
  ): Promise<ActionSpecGetResponse> {
    const collectibleComic = await this.prisma.collectibleComic.findUnique({
      where: { address },
      include: {
        metadata: true,
      },
    });

    if (!collectibleComic) {
      throw new BadRequestException("Asset doesn't exists or unverified");
    }

    const { metadata } = collectibleComic;

    let actions: LinkedAction[];
    if (metadata.isSigned) {
      actions = [
        { label: `${collectibleComic.name} is already Signed 🎉`, href: '' },
      ];
    } else {
      const actionEndpoint = `${process.env.API_URL}/transaction/blink/comic-sign/${address}`;
      actions = [
        { label: `Sign ${collectibleComic.name} ✍️`, href: actionEndpoint },
      ];
    }

    const offChainMetadata = await fetchOffChainMetadata(metadata.uri);
    return {
      icon: offChainMetadata.image,
      title: `${collectibleComic.name}`,
      description: 'Get signature from the comic creator',
      label: 'Sign ✍️',
      links: { actions },
    };
  }

  async signComicAction(address: PublicKey, creator: PublicKey) {
    const collectibleComic = await this.prisma.collectibleComic.findUnique({
      where: { address: address.toString() },
      include: { metadata: true },
    });

    if (!collectibleComic) {
      throw new BadRequestException("Asset doesn't exists or unverified");
    }

    const { metadata } = collectibleComic;
    if (metadata.isSigned) {
      throw new BadRequestException('Comic is already signed !');
    }

    const collection = await this.prisma.collectibleComicCollection.findUnique({
      where: { address: metadata.collectionAddress },
    });

    if (!collection) {
      throw new BadRequestException('Asset is not from a verified collection');
    }

    if (collection.creatorBackupAddress !== creator.toString()) {
      throw new UnauthorizedException(
        'Only the creator of the comic can sign !',
      );
    }

    return this.transactionService.createChangeComicStateTransaction(
      address,
      creator,
      ComicStateArgs.Sign,
    );
  }

  async mintComicAction(account: UmiPublicKey, couponId: number) {
    const { candyMachineAddress, currencySettings } =
      await this.prisma.candyMachineCoupon.findUnique({
        where: { id: couponId },
        include: { currencySettings: true },
      });

    if (!candyMachineAddress) {
      throw new BadRequestException('No active mint found');
    }

    const currencySetting = currencySettings.find(
      (setting) => setting.splTokenAddress === WRAPPED_SOL_MINT.toString(),
    );

    if (!currencySetting) {
      throw new BadRequestException(
        'Mint is not active in SOL, try minting from platform',
      );
    }

    return this.candyMachineService.createMintTransaction(
      publicKey(account),
      publicKey(candyMachineAddress),
      currencySetting.label,
      couponId,
    );
  }
}
