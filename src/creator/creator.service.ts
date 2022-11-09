import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateCreatorDto,
  CreateCreatorFilesDto,
} from 'src/creator/dto/create-creator.dto';
import { UpdateCreatorDto } from 'src/creator/dto/update-creator.dto';
import {
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
  uploadFile,
} from '../aws/s3client';
import { isEmpty } from 'lodash';
import { Creator } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subDays } from 'date-fns';

@Injectable()
export class CreatorService {
  constructor(private prisma: PrismaService) {}

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
      if (avatar) avatarKey = await uploadFile(prefix, avatar);
      if (banner) bannerKey = await uploadFile(prefix, banner);
      if (logo) logoKey = await uploadFile(prefix, logo);
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

  async findAll() {
    const creators = await this.prisma.creator.findMany({
      include: { comics: true },
      where: {
        deletedAt: null,
        emailConfirmedAt: { not: null },
        verifiedAt: { not: null },
      },
    });
    return creators;
  }

  async findOne(slug: string) {
    const creator = await this.prisma.creator.findUnique({
      include: { comics: true },
      where: { slug },
    });

    if (!creator) {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    return creator;
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
    const newFileKey = await uploadFile(prefix, file);

    try {
      creator = await this.prisma.creator.update({
        where: { slug },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await deleteS3Object({ Key: newFileKey });
      throw new BadRequestException('Malformed file upload');
    }

    if (oldFileKey !== newFileKey) {
      await deleteS3Object({ Key: oldFileKey });
    }

    return creator;
  }

  async pseudoDelete(slug: string) {
    try {
      await this.prisma.creator.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
  }

  async pseudoRecover(slug: string) {
    try {
      await this.prisma.creator.update({
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
    const keys = await listS3FolderKeys({ Prefix: prefix });

    if (!isEmpty(keys)) {
      await deleteS3Objects({
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      });
    }

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
