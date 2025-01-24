import { ApiProperty } from '@nestjs/swagger';
import { WheelRewardReceipt, WheelRewardType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsString, IsEnum, IsNumber, IsBoolean } from 'class-validator';

export class WheelReceiptDto {
  @IsInt()
  id: number;

  @IsNumber()
  amount: number;

  @IsString()
  itemId: string;

  @IsEnum(WheelRewardType)
  @ApiProperty({ enum: WheelRewardType })
  rewardType: WheelRewardType;

  @IsBoolean()
  isClaimed: boolean;
}

export type WheelReceiptInput = WheelRewardReceipt & {
  itemId: string;
  amount: number;
  type: WheelRewardType;
};

export function toWheelReceiptDto(input: WheelReceiptInput) {
  const plainWheelReceiptDto: WheelReceiptDto = {
    id: input.id,
    rewardType: input.type,
    itemId: input.itemId,
    amount: input.amount,
    isClaimed: !!input.claimedAt,
  };

  return plainToInstance(WheelReceiptDto, plainWheelReceiptDto);
}
