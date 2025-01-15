import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WheelService } from './wheel.service';
import { AdminGuard } from 'src/guards/roles.guard';
import { CreateWheelDto } from './dto/create-wheel.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { AddRewardDto } from './dto/add-reward.dto';
import { AddDropsDto } from './dto/add-drops.dto';
import { toWheelDto } from './dto/wheel.dto';
import { UpdateRewardDto, UpdateWheelDto } from './dto/update.dto';
import { toRewardDto } from './dto/rewards.dto';
import { toWheelReceiptDto } from './dto/wheel-receipt.dto';

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

  @Get('get/:id')
  async findOne(@Param('id') id: string) {
    const wheel = await this.wheel.get(+id);
    return toWheelDto(wheel);
  }

  @UserAuth()
  @Patch('spin/:id')
  async spin(@Param('id') id: string, @UserEntity() user: UserPayload) {
    const receipt = await this.wheel.spin(+id, user.id);
    return toWheelReceiptDto(receipt);
  }

  @AdminGuard()
  @Patch('add/reward/:id')
  async addReward(@Param('id') id: string, @Body() addRewardDto: AddRewardDto) {
    return await this.wheel.addReward(+id, addRewardDto);
  }

  @AdminGuard()
  @Patch('update/reward/:id')
  async updateReward(
    @Param('id') id: number,
    @Body() updateRewardDto: UpdateRewardDto,
  ) {
    const reward = await this.wheel.updateReward(id, updateRewardDto);
    return toRewardDto(reward);
  }

  @AdminGuard()
  @Patch('add/drops/:rewardId')
  async addDrops(
    @Param('rewardId') rewardId: string,
    @Body() addDropsDto: AddDropsDto,
  ) {
    return await this.wheel.addDrops(+rewardId, addDropsDto);
  }
}
