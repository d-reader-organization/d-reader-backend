import { PrismaService } from 'nestjs-prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWheelDto } from './dto/create-wheel.dto';
import { s3Service } from '../aws/s3.service';
import { appendTimestamp } from '../utils/helpers';
import { kebabCase } from 'lodash';
import { validateWheelDate } from '../utils/wheel';

const getS3Folder = (slug: string) => `wheel/${slug}/`;

@Injectable()
export class WheelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: s3Service
  ) {}

  async create(createWheelDto:CreateWheelDto) {
    const {name,startsAt,expiresAt,winProbability,image} = createWheelDto;
    validateWheelDate(startsAt,expiresAt)

    if(winProbability <= 0 && winProbability >= 100){
        throw new BadRequestException("Winning probability should be between 1-99");
    }

    const slug = kebabCase(name);
    const s3BucketSlug = appendTimestamp(slug);
    const s3Folder = getS3Folder(s3BucketSlug);

    const imageKey = await this.s3.uploadFile(image,{s3Folder});
    const wheel = await this.prisma.wheel.create({ data:{...createWheelDto,image:imageKey,s3BucketSlug} });
    return wheel;
  }
  async addReward(){}
  async removeReward(){}
  async update(){}
  async updateReward(){}
  async get() {}
  async spin() {}
}
