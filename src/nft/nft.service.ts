import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { NftFilterParams } from './dto/nft-filter-params.dto';

@Injectable()
export class NftService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: NftFilterParams) {
    const nfts = await this.prisma.nft.findMany({
      where: { ownerAddress: query?.owner },
      skip: query?.skip,
      take: query?.take,
      orderBy: { name: 'asc' },
    });

    return nfts;
  }

  async findOne(address: string) {
    const nft = await this.prisma.nft.findUnique({
      where: { address },
      include: {
        collectionNft: {
          include: {
            comicIssue: true,
          },
        },
      },
    });

    if (!nft) {
      throw new NotFoundException(`NFT with address ${address} does not exist`);
    }

    return nft;
  }
}
