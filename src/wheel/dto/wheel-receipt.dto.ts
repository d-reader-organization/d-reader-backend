import { ApiProperty } from '@nestjs/swagger';
import { WheelRewardReceipt, WheelRewardType } from '@prisma/client';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
} from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';
import {
  AttributeDto,
  AttributeInput,
  toAttributeDtoArray,
} from 'src/digital-asset/dto/attribute.dto';
import { ifDefined } from 'src/utils/lodash';

export class WheelReceiptDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsNumber()
  amount: number;

  @IsString()
  image: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  itemId: string;

  @IsString()
  @IsOptional()
  walletAddress?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WheelRewardType)
  rewardType: WheelRewardType;

  @IsOptional()
  @Transform(({ value }: { value: string[] }) => {
    const attributesDtoArray = value.map((item) => JSON.parse(item));
    return attributesDtoArray;
  })
  @IsArray()
  @ApiProperty({ type: AttributeDto })
  @Type(() => AttributeDto)
  attributes?: AttributeDto[];
}

export type WheelReceiptInput = WheelRewardReceipt & {
  itemId: string;
  image: string;
  name: string;
  amount: number;
  type: WheelRewardType;
  currency?: string;
  description?: string;
  attributes?: AttributeInput[];
};

export function toWheelReceiptDto(input: WheelReceiptInput) {
  const plainWheelReceiptDto: WheelReceiptDto = {
    id: input.id,
    name: input.name,
    image: input.image ? getPublicUrl(input.image) : undefined,
    rewardType: input.type,
    itemId: input.itemId,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    attributes: ifDefined(input.attributes, toAttributeDtoArray),
  };

  return plainToInstance(WheelReceiptDto, plainWheelReceiptDto);
}
