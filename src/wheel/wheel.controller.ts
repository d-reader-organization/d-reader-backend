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

@ApiTags('Wheel')
@Controller('wheel')
export class WheelController {
  constructor(private readonly wheel: WheelService) {}

  @AdminGuard()
  @Post('create')
  async create(@Body() createWheelDto: CreateWheelDto) {
    const wheel = await this.wheel.create(createWheelDto);
    return wheel;
  }

  @Get('get/:id')
  async findOne(@Param('id') id: string) {
    const wheel = await this.wheel.get(+id);
    return wheel;
  }

  @UserAuth()
  @Patch('spin/:id')
  async spin(@Param('id') id: string, @UserEntity() user: UserPayload) {
    const receipt = await this.wheel.spin(+id, user.id);
    return receipt;
  }

  @AdminGuard()
  @Patch('add/reward/:id')
  async addReward(@Param('id') id: string, @Body() addRewardDto: AddRewardDto) {
    return await this.wheel.addReward(+id, addRewardDto);
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
