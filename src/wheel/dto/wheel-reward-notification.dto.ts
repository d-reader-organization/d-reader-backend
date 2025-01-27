import { IsDate, IsNumber, IsString } from 'class-validator';
import { RewardDto, toRewardDto } from './rewards.dto';
import { plainToInstance, Type } from 'class-transformer';
import { WheelReward, WheelRewardReceipt } from '@prisma/client';
import { toUserDto, UserDto, UserInput } from 'src/user/dto/user.dto';

export class WheelRewardNotificationDto {
  @IsNumber()
  id: number;

  @Type(() => UserDto)
  user: UserDto;

  @Type(() => RewardDto)
  reward: RewardDto;

  @IsString()
  message: string;

  @IsDate()
  createdAt: Date;
}

type WithReward = { reward: WheelReward };
type WithUser = { user: UserInput };
export type WheelRewardNotificationInput = WheelRewardReceipt &
  WithReward &
  WithUser & { message: string };

export function toWheelRewardNotificationDto(
  input: WheelRewardNotificationInput,
) {
  const plainWheelRewardNotificationDto: WheelRewardNotificationDto = {
    id: input.id,
    user: toUserDto(input.user),
    createdAt: input.createdAt,
    reward: toRewardDto(input.reward),
    message: input.message,
  };

  const wheelRewardNotificationDto = plainToInstance(
    WheelRewardNotificationDto,
    plainWheelRewardNotificationDto,
  );
  return wheelRewardNotificationDto;
}
