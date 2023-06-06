import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateCreatorDto,
  CreateCreatorFilesDto,
} from '../creator/dto/create-creator.dto';
import { UpdateCreatorDto } from '../creator/dto/update-creator.dto';
import { Creator } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subDays } from 'date-fns';
import { CreatorFilterParams } from './dto/creator-filter-params.dto';
import { WalletCreatorService } from './wallet-creator.service';
import { s3Service } from '../aws/s3.service';

@Injectable()
export class CreatorService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly walletCreatorService: WalletCreatorService,
  ) {}

  async create(
    walletAddress: string,
    createCreatorDto: CreateCreatorDto,
    createCreatorFilesDto: CreateCreatorFilesDto,
  ) {
    const { slug, ...rest } = createCreatorDto;

    // Create Creator without any files uploaded
    let creator: Creator;
    try {
      creator = await this.prisma.creator.create({
        data: { ...rest, slug, walletAddress },
      });
    } catch {
      throw new BadRequestException('Bad creator data');
    }

    const { avatar, banner, logo } = createCreatorFilesDto;

    // Upload files if any
    let avatarKey: string, bannerKey: string, logoKey: string;
    try {
      const prefix = await this.getS3FilePrefix(slug);
      if (avatar) avatarKey = await this.s3.uploadFile(prefix, avatar);
      if (banner) bannerKey = await this.s3.uploadFile(prefix, banner);
      if (logo) logoKey = await this.s3.uploadFile(prefix, logo);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    // Update Creator with s3 file keys
    creator = await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        avatar: avatarKey,
        banner: bannerKey,
        logo: logoKey,
      },
    });

    return creator;
  }

  async findAll(query: CreatorFilterParams) {
    const creators = await this.prisma.creator.findMany({
      include: { comics: true },
      skip: query.skip,
      take: query.take,
      where: {
        name: { contains: query?.nameSubstring, mode: 'insensitive' },
        deletedAt: null,
        emailConfirmedAt: { not: null },
        verifiedAt: { not: null },
      },
      orderBy: { name: query.sortOrder ?? 'asc' },
    });

    const aggregatedCreators = await Promise.all(
      creators.map(async (creator) => ({
        ...creator,
        stats: await this.walletCreatorService.aggregateCreatorStats(
          creator.slug,
        ),
      })),
    );
    return aggregatedCreators;
  }

  async findOne(slug: string, walletAddress: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { slug },
    });

    if (!creator) {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    const { stats, myStats } = await this.walletCreatorService.aggregateAll(
      slug,
      walletAddress,
    );

    return { ...creator, stats, myStats };
  }

  async update(slug: string, updateCreatorDto: UpdateCreatorDto) {
    try {
      const updatedCreator = await this.prisma.creator.update({
        where: { slug },
        data: updateCreatorDto,
      });

      return updatedCreator;
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
  }

  async updateFile(slug: string, file: Express.Multer.File) {
    let creator: Creator;
    try {
      creator = await this.prisma.creator.findUnique({ where: { slug } });
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    const oldFileKey = creator[file.fieldname];
    const prefix = await this.getS3FilePrefix(slug);
    const newFileKey = await this.s3.uploadFile(prefix, file);

    try {
      creator = await this.prisma.creator.update({
        where: { slug },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject({ Key: newFileKey });
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey !== newFileKey) {
      await this.s3.deleteObject({ Key: oldFileKey });
    }

    return creator;
  }

  async pseudoDelete(slug: string) {
    try {
      return await this.prisma.creator.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
  }

  async pseudoRecover(slug: string) {
    try {
      return await this.prisma.creator.update({
        where: { slug },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
  }

  async remove(slug: string) {
    // Remove s3 assets
    const prefix = await this.getS3FilePrefix(slug);
    const keys = await this.s3.listFolderKeys({ Prefix: prefix });
    await this.s3.deleteObjects(keys);

    try {
      await this.prisma.creator.delete({ where: { slug } });
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
    return;
  }

  async getS3FilePrefix(slug: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { slug },
      select: { slug: true },
    });

    if (!creator) {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    const prefix = `creators/${slug}/`;
    return prefix;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearCreatorsQueuedForRemoval() {
    const creatorsToRemove = await this.prisma.creator.findMany({
      where: { deletedAt: { lte: subDays(new Date(), 30) } }, // 30 days ago
    });

    for (const creator of creatorsToRemove) {
      await this.remove(creator.slug);
      console.log(`Removed creator ${creator.slug} at ${new Date()}`);
    }
  }
}
