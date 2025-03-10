import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WheelService } from './wheel.service';
import { AdminGuard } from 'src/guards/roles.guard';
import { CreateWheelDto } from './dto/create-wheel.dto';
import { UserEntity } from 'src/decorators/user.decorator';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { AddRewardDto } from './dto/add-reward.dto';
import { AddDropsDto } from './dto/add-drops.dto';
import { toWheelDto } from './dto/wheel.dto';
import { UpdateRewardDto, UpdateWheelDto } from './dto/update.dto';
import { toRewardDto } from './dto/rewards.dto';
import { toWheelReceiptDto } from './dto/wheel-receipt.dto';
import { WheelParams } from './dto/wheel-params.dto';
import { OptionalUserAuth } from 'src/guards/optional-user-auth.guard';
import { VerifiedUserAuthGuard } from 'src/guards/verified-user-auth.guard';
import { WheelRewardHistoryParams } from './dto/wheel-history-params.dto';
import { toWheelRewardHistoryDtoArray } from './dto/wheel-reward-history.dto';

// TODO: Handle images in form body in respected endpoints
@ApiTags('Wheel')
@Controller('wheel')
export class WheelController {
  constructor(private readonly wheel: WheelService) {}

  @AdminGuard()
  @Post('create')
  async create(@Body() createWheelDto: CreateWheelDto) {
    const wheel = await this.wheel.create(createWheelDto);
    return toWheelDto(wheel);
  }

  @AdminGuard()
  @Patch('update/:id')
  async update(
    @Param('id') id: number,
    @Body() updateWheelDto: UpdateWheelDto,
  ) {
    const wheel = await this.wheel.update(id, updateWheelDto);
    return toWheelDto(wheel);
  }

  @OptionalUserAuth()
  @Get('get')
  async findOne(
    @Query() params: WheelParams,
    @UserEntity() user?: UserPayload,
  ) {
    const wheel = await this.wheel.get(params, user);
    return toWheelDto(wheel);
  }

  @VerifiedUserAuthGuard()
  @Patch('spin/:id')
  async spin(@Param('id') id: string, @UserEntity() user: UserPayload) {
    const receipt = await this.wheel.spin(+id, user.id);
    return toWheelReceiptDto(receipt);
  }

  @Get('get/reward-history')
  async getWheelRewardHistory(@Query() params: WheelRewardHistoryParams) {
    const rewardHistory = await this.wheel.findWheelRewardHistory(params);
    return toWheelRewardHistoryDtoArray(rewardHistory);
  }

  @AdminGuard()
  @Patch('add/:id/reward')
  async addReward(@Param('id') id: string, @Body() addRewardDto: AddRewardDto) {
    return await this.wheel.addReward(+id, addRewardDto);
  }

  @AdminGuard()
  @Patch('reward/update/:id')
  async updateReward(
    @Param('id') id: number,
    @Body() updateRewardDto: UpdateRewardDto,
  ) {
    const reward = await this.wheel.updateReward(id, updateRewardDto);
    return toRewardDto(reward);
  }

  @AdminGuard()
  @Patch('reward/:id/add-drops')
  async addDrops(@Param('id') id: string, @Body() addDropsDto: AddDropsDto) {
    return await this.wheel.addDrops(+id, addDropsDto);
  }
}
