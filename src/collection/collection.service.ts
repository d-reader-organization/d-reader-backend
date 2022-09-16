import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateCollectionDto } from 'src/collection/dto/create-collection.dto';
import { UpdateCollectionDto } from 'src/collection/dto/update-collection.dto';
import { putS3Object } from '../aws/s3client';
import { Collection } from '@prisma/client';
import { snakeCase } from 'lodash';

@Injectable()
export class CollectionService {
  constructor(private prisma: PrismaService) {}

  async create(createCollectionDto: CreateCollectionDto) {
    const { thumbnail, pfp, logo, hashlist, ...rest } = createCollectionDto;

    // $transaction API?
    // try catch file uploads
    const thumbnailKey = snakeCase(createCollectionDto.name) + '/thumbnail.png';
    await putS3Object({ Key: thumbnailKey, Body: thumbnail.buffer });

    const pfpKey = snakeCase(createCollectionDto.name) + '/pfp.png';
    await putS3Object({ Key: pfpKey, Body: pfp.buffer });

    let logoKey: string;
    if (logo) {
      logoKey = snakeCase(createCollectionDto.name) + '/logo.png';
      await putS3Object({ Key: logoKey, Body: logo.buffer });
    }

    const collection = await this.prisma.collection.create({
      data: {
        ...rest,
        slug: snakeCase(rest.name),
        thumbnail: thumbnailKey,
        pfp: pfpKey,
        logo: logoKey,
        nfts: {
          createMany: {
            data: hashlist.map((hash) => ({ mint: hash })),
          },
        },
      },
    });

    return collection;
  }

  async findAll() {
    const collections = await this.prisma.collection.findMany();
    return collections;
  }

  async findOne(name: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { name },
    });

    if (!collection) {
      throw new NotFoundException(
        `Collection with name ${name} does not exist`,
      );
    }

    return collection;
  }

  async update(name: string, updateCollectionDto: UpdateCollectionDto) {
    const { thumbnail, pfp, logo, ...rest } = updateCollectionDto;

    // TODO: if name has changed, update folder names in the S3 bucket
    // if (updateCollectionDto.name && name !== updateCollectionDto.name)

    // $transaction API? revert on this.prisma.collection.update exception
    // try catch file uploads
    let thumbnailKey: string;
    if (thumbnail) {
      thumbnailKey = snakeCase(name) + '/thumbnail.png';
      await putS3Object({ Key: thumbnailKey, Body: thumbnail.buffer });
    }

    let pfpKey: string;
    if (pfp) {
      pfpKey = snakeCase(name) + '/pfp.png';
      await putS3Object({ Key: pfpKey, Body: pfp.buffer });
    }

    let logoKey: string;
    if (logo) {
      logoKey = snakeCase(name) + '/logo.png';
      await putS3Object({ Key: logoKey, Body: logo.buffer });
    }

    let updatedCollection: Collection;
    try {
      updatedCollection = await this.prisma.collection.update({
        where: { name },
        data: rest,
      });
    } catch {
      throw new NotFoundException(
        `Collection with name ${name} does not exist`,
      );
    }

    return updatedCollection;
  }

  async remove(name: string) {
    // TODO: move this state outside
    // Delete: {
    //   Objects: [{ Key: 'object1' }, { Key: 'object2' }],
    // },
    try {
      await this.prisma.collection.delete({ where: { name } });
    } catch {
      throw new NotFoundException(
        `Collection with name ${name} does not exist`,
      );
    }
    return;
  }
}
