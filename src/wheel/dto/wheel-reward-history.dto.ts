import { IsDate, IsNumber, IsString } from 'class-validator';
import { RewardDto, toRewardDto } from './rewards.dto';
import { plainToInstance, Type } from 'class-transformer';
import { WheelReward, WheelRewardReceipt } from '@prisma/client';
import { toUserDto, UserDto, UserInput } from 'src/user/dto/user.dto';

export class WheelRewardHistoryDto {
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
type WithWheelHistoryMessage = { message: string };
export type WheelRewardHistoryInput = WheelRewardReceipt &
  WithReward &
  WithUser &
  WithWheelHistoryMessage;

export function toWheelRewardHistoryDto(input: WheelRewardHistoryInput) {
  const plainWheelRewardHistoryDto: WheelRewardHistoryDto = {
    id: input.id,
    user: toUserDto(input.user),
    createdAt: input.createdAt,
    reward: toRewardDto(input.reward),
    message: input.message,
  };

  const wheelRewardHistoryDto = plainToInstance(
    WheelRewardHistoryDto,
    plainWheelRewardHistoryDto,
  );
  return wheelRewardHistoryDto;
}

export function toWheelRewardHistoryDtoArray(
  rewards: WheelRewardHistoryInput[],
) {
  return rewards.map(toWheelRewardHistoryDto);
}
