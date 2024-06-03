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
}
