import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { DigitalAssetFilterParams } from './dto/digital-asset-params.dto';

@Injectable()
export class DigitalAssetService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DigitalAssetFilterParams) {
    const assets = await this.prisma.digitalAsset.findMany({
      where: {
        owner: {
          address: query?.ownerAddress,
          userId: query.userId ? +query.userId : undefined,
        },
        metadata: {
          collection: {
            comicIssue: query.comicIssueId
              ? { id: query.comicIssueId ? +query.comicIssueId : undefined }
              : { comic: { slug: query.comicSlug } },
          },
        },
      },
      skip: query?.skip,
      take: query?.take,
      include: { metadata: { include: { collection: true } } },
      orderBy: { name: 'asc' },
    });
    return assets;
  }

  async findOne(address: string) {
    const asset = await this.prisma.digitalAsset.findUnique({
      where: { address },
      include: {
        metadata: { include: { collection: true } },
        listing: { where: { canceledAt: new Date(0) } },
      },
    });

    if (!asset) {
      throw new NotFoundException(
        `Asset with address ${address} does not exist`,
      );
    }

    return asset;
  }

  async getTwitterContent(address: string) {
    const { collection, ...metadata } = await this.prisma.metadata.findFirst({
      where: { asset: { some: { address } } },
      include: {
        collection: {
          include: {
            comicIssue: { include: { statelessCovers: true, comic: true } },
          },
        },
      },
    });
    const { comicIssue } = collection;
    const statelessCover = comicIssue.statelessCovers.find(
      (cover) => cover.rarity === metadata.rarity,
    );

    const dReaderIssueMintUrl = `https://dreader.app/mint/${comicIssue.comicSlug}_${comicIssue.slug}?utm_source=web`;

    return `https://twitter.com/intent/tweet?text=I just minted a ${metadata.rarity.toString()} ${comicIssue
      .comic?.title}: ${comicIssue.title} comic on @dReaderApp! 📚 ${
      statelessCover.artistTwitterHandle
        ? `\nCover by @${statelessCover.artistTwitterHandle}`
        : ''
    } \n\nMint yours here while the supply lasts.👇\n\n${dReaderIssueMintUrl} \n`;
  }
}
