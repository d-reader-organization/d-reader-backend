import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Type } from 'class-transformer';
import { IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { RewardDto, toRewardDto } from './rewards.dto';
import {
  CollectibleComicDropDto,
  CollectibleComicDropInput,
  FungibleDropDto,
  FungibleDropInput,
  OneOfOneDropDto,
  OneOfOneDropInput,
  PhysicalDropDto,
  PhysicalDropInput,
  PrintEditionDropDto,
  PrintEditionDropInput,
  toCollectibleComicDropDto,
  toFungibleDropDto,
  toOneOfOneDropDto,
  toPhysicalDropDto,
  toPrintEditionDropDto,
} from './drop.dto';
import { WheelReward, WheelRewardReceipt } from '@prisma/client';
import { ifDefined } from 'src/utils/lodash';
import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/utils/errors';

export class WheelReceiptDto {
  @IsNumber()
  id: number;

  @IsOptional()
  @Type(() => CollectibleComicDropDto)
  @ApiProperty({ type: CollectibleComicDropDto })
  collectibleComicDrop?: CollectibleComicDropDto;

  @IsOptional()
  @Type(() => PrintEditionDropDto)
  @ApiProperty({ type: PrintEditionDropDto })
  printEditionDrop?: PrintEditionDropDto;

  @IsOptional()
  @Type(() => OneOfOneDropDto)
  @ApiProperty({ type: OneOfOneDropDto })
  oneOfOneDrop?: OneOfOneDropDto;

  @IsOptional()
  @Type(() => FungibleDropDto)
  @ApiProperty({ type: FungibleDropDto })
  fungibleDrop?: FungibleDropDto;

  @IsOptional()
  @Type(() => PhysicalDropDto)
  @ApiProperty({ type: PhysicalDropDto })
  physicalDrop?: PhysicalDropDto;

  @Type(() => RewardDto)
  @ApiProperty({ type: RewardDto })
  reward: RewardDto;

  @IsBoolean()
  isClaimed: boolean;
}

type WithCollectibleComicDrop = {
  collectibleComicDrop?: CollectibleComicDropInput;
};
type WithOneOfOneDrop = { oneOfOneDrop?: OneOfOneDropInput };
type WithPrintEditionDrop = { printEditionDrop?: PrintEditionDropInput };
type WithPhysicalDrop = { physicalDrop?: PhysicalDropInput };
type WithFungibleDrop = { fungibleDrop?: FungibleDropInput };
type WithRewardDetails = { reward: WheelReward };

export type WheelReceiptInput = WheelRewardReceipt &
  WithRewardDetails &
  WithCollectibleComicDrop &
  WithFungibleDrop &
  WithOneOfOneDrop &
  WithPhysicalDrop &
  WithPrintEditionDrop;

export async function toWheelReceiptDto(input: WheelReceiptInput) {
  const isValidInput = validateReceiptInput(input);
  if (!isValidInput) {
    throw new NotFoundException(ERROR_MESSAGES.INVALID_RESPONSE_BODY);
  }

  const plainWheelReceiptDto: WheelReceiptDto = {
    id: input.id,
    isClaimed: !!input.claimedAt,
    reward: toRewardDto(input.reward),
    collectibleComicDrop: ifDefined(
      input.collectibleComicDrop,
      toCollectibleComicDropDto,
    ),
    oneOfOneDrop: ifDefined(input.oneOfOneDrop, toOneOfOneDropDto),
    printEditionDrop: ifDefined(input.printEditionDrop, toPrintEditionDropDto),
    physicalDrop: ifDefined(input.physicalDrop, toPhysicalDropDto),
    fungibleDrop: ifDefined(input.fungibleDrop, toFungibleDropDto),
  };

  const wheelReceiptDto = plainToInstance(
    WheelReceiptDto,
    plainWheelReceiptDto,
  );
  return wheelReceiptDto;
}

function validateReceiptInput(input: WheelReceiptInput) {
  if (input.reward.type == 'None') return true;

  const {
    collectibleComicDrop,
    printEditionDrop,
    physicalDrop,
    oneOfOneDrop,
    fungibleDrop,
  } = input;
  if (
    !collectibleComicDrop &&
    !printEditionDrop &&
    !physicalDrop &&
    !oneOfOneDrop &&
    !fungibleDrop
  ) {
    return false;
  }

  return true;
}
