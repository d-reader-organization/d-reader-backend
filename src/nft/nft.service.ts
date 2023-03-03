import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { NftFilterParams } from './dto/nft-filter-params.dto';

@Injectable()
export class NftService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: NftFilterParams, address?: string) {
    const nfts = await this.prisma.nft.findMany({
      where: { ownerAddress: address },
      skip: query?.skip,
      take: query?.take,
      orderBy: { name: 'asc' },
    });

    return nfts;
  }

  async findOne(address: string) {
    const nft = await this.prisma.nft.findUnique({
      where: { address },
    });

    if (!nft) {
      throw new NotFoundException(`NFT with address ${address} does not exist`);
    }

    return nft;
  }
}
