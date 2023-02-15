import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { PickByType } from 'src/types/shared';
import { WalletComicIssue } from '@prisma/client';

@Injectable()
export class WalletComicIssueService {
  constructor(private prisma: PrismaService) {}

  async rate(walletAddress: string, comicIssueId: number, rating: number) {
    return await this.prisma.walletComicIssue.upsert({
      where: { comicIssueId_walletAddress: { walletAddress, comicIssueId } },
      create: { walletAddress, comicIssueId, rating },
      update: { rating },
    });
  }

  async toggleState(
    walletAddress: string,
    comicIssueId: number,
    property: keyof PickByType<WalletComicIssue, boolean>,
  ) {
    let walletComicIssue = await this.prisma.walletComicIssue.findUnique({
      where: { comicIssueId_walletAddress: { walletAddress, comicIssueId } },
    });
    if (!walletComicIssue) {
      return null;
    }

    walletComicIssue = await this.prisma.walletComicIssue.upsert({
      where: { comicIssueId_walletAddress: { walletAddress, comicIssueId } },
      create: { walletAddress, comicIssueId, [property]: true },
      update: { [property]: !walletComicIssue?.[property] },
    });

    return walletComicIssue;
  }

  async refreshDate(
    walletAddress: string,
    comicIssueId: number,
    property: keyof PickByType<WalletComicIssue, Date>,
  ) {
    return await this.prisma.walletComicIssue.upsert({
      where: {
        comicIssueId_walletAddress: { walletAddress, comicIssueId },
      },
      create: {
        walletAddress,
        comicIssueId,
        [property]: new Date().toISOString(),
      },
      update: { [property]: new Date().toISOString() },
    });
  }
}
