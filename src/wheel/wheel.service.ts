import { PrismaService } from 'nestjs-prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWheelDto } from './dto/create-wheel.dto';
import { s3Service } from '../aws/s3.service';
import { appendTimestamp } from '../utils/helpers';
import { kebabCase } from 'lodash';
import { validateWheelDate } from '../utils/wheel';
import { AddRewardDto } from './dto/add-reward.dto';

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

  async addReward(wheelId:number, addRewardDto: AddRewardDto){

    const {image} = addRewardDto;

    const wheel = await this.prisma.wheel.findUnique({where:{id:wheelId}});
    const s3Folder = getS3Folder(wheel.s3BucketSlug);
    const imageKey = await this.s3.uploadFile(image,{s3Folder});

    const reward = await this.prisma.wheelReward.create({
      data:{
        ...addRewardDto,
        image: imageKey,
        wheel:{
          connect:{id:wheelId}
        }
      }
    });

    return reward;
  }
  
  async removeReward(rewardId:number){
    await this.prisma.wheelReward.update({where:{id:rewardId},data:{isActive:false}});
  }

  async update(){}
  async updateReward(){}
  async get(id:number) {
    const wheel = await this.prisma.wheel.findUnique({where:{id},include:{rewards:true}});
    return wheel;
  }
  async spin() {}
}
