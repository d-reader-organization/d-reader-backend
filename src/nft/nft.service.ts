import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { NftFilterParams } from './dto/nft-params.dto';

@Injectable()
export class NftService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: NftFilterParams) {
    const nfts = await this.prisma.nft.findMany({
      where: {
        owner: {
          address: query?.ownerAddress,
          userId: query.userId ? +query.userId : undefined,
        },
        collectionNft: {
          comicIssue: query.comicIssueId
            ? { id: query.comicIssueId ? +query.comicIssueId : undefined }
            : { comic: { slug: query.comicSlug } },
        },
      },
      skip: query?.skip,
      take: query?.take,
      include: { collectionNft: true },
      orderBy: { name: 'asc' },
    });
    return nfts;
  }

  async findOne(address: string) {
    const nft = await this.prisma.nft.findUnique({
      where: { address },
      include: {
        collectionNft: true,
        listing: { where: { canceledAt: new Date(0) } },
      },
    });

    if (!nft) {
      throw new NotFoundException(`NFT with address ${address} does not exist`);
    }

    return nft;
  }
}
