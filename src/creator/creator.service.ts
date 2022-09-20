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
  putS3Object,
} from '../aws/s3client';
import { isEmpty } from 'lodash';
import * as path from 'path';

@Injectable()
export class CreatorService {
  constructor(private prisma: PrismaService) {}

  async create(
    walletId: number,
    createCreatorDto: CreateCreatorDto,
    createCreatorFilesDto: CreateCreatorFilesDto,
  ) {
    const { slug, ...rest } = createCreatorDto;
    const { thumbnail, avatar, banner, logo } = createCreatorFilesDto;

    // Upload files if any
    let thumbnailKey: string,
      avatarKey: string,
      bannerKey: string,
      logoKey: string;
    try {
      if (thumbnail) thumbnailKey = await this.uploadFile(slug, thumbnail);
      if (avatar) avatarKey = await this.uploadFile(slug, avatar);
      if (banner) bannerKey = await this.uploadFile(slug, banner);
      if (logo) logoKey = await this.uploadFile(slug, logo);
    } catch {
      throw new BadRequestException('Malformed file upload');
    }

    try {
      const creator = await this.prisma.creator.create({
        data: {
          ...rest,
          slug,
          walletId,
          thumbnail: thumbnailKey,
          avatar: avatarKey,
          banner: bannerKey,
          logo: logoKey,
        },
      });

      return creator;
    } catch {
      // Revert file upload
      if (thumbnailKey) await deleteS3Object({ Key: thumbnailKey });
      if (avatarKey) await deleteS3Object({ Key: avatarKey });
      if (bannerKey) await deleteS3Object({ Key: bannerKey });
      if (logoKey) await deleteS3Object({ Key: logoKey });
      throw new BadRequestException('Faulty creator data');
    }
  }

  async findAll() {
    const creators = await this.prisma.creator.findMany({
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
      where: { slug },
    });

    if (!creator) {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    return creator;
  }

  async update(slug: string, updateCreatorDto: UpdateCreatorDto) {
    const { ...rest } = updateCreatorDto;

    // TODO: if name has changed, update folder names in the S3 bucket
    // if (updateCreatorDto.name && name !== updateCreatorDto.name)
    // copy folder and delete the old one, update keys in the database
    // https://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/examples-s3-objects.html#copy-object
    // https://www.anycodings.com/1questions/5143423/nodejs-renaming-s3-object-via-aws-sdk-module

    try {
      const updatedCreator = await this.prisma.creator.update({
        where: { slug },
        data: rest,
      });

      return updatedCreator;
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
  }

  async updateFile(slug: string, file: Express.Multer.File) {
    const fileKey = await this.uploadFile(slug, file);
    try {
      const updatedCreator = await this.prisma.creator.update({
        where: { slug },
        data: { [file.fieldname]: fileKey },
      });

      return updatedCreator;
    } catch {
      // Revert file upload
      await deleteS3Object({ Key: fileKey });
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
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
    const keys = await listS3FolderKeys({ Prefix: `creators/${slug}` });

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

  async uploadFile(slug: string, file: Express.Multer.File) {
    if (file) {
      const fileKey = `creators/${slug}/${file.fieldname}${path.extname(
        file.originalname,
      )}`;

      await putS3Object({
        ContentType: file.mimetype,
        Key: fileKey,
        Body: file.buffer,
      });

      return fileKey;
    } else {
      throw new BadRequestException(`No valid ${file.fieldname} file provided`);
    }
  }
}
