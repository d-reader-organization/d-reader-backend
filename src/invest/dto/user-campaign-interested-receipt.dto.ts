import { User, UserCampaignInterestReceipt } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';
import { PaginatedResponseDto } from 'src/types/paginated-response.dto';
import { BasicUserDto, toBasicUserDto } from 'src/user/dto/basic-user-dto';

export class UserCampaignInterestedReceiptDto {
  @IsNumber()
  id: number;

  @IsString()
  campaignSlug: string;

  @IsDate()
  timestamp: Date;

  @Type(() => BasicUserDto)
  user: BasicUserDto;

  @IsNumber()
  expressedAmount: number;
}

export type UserCampaignInterestedReceiptInput = UserCampaignInterestReceipt & {
  user: User;
};

export function toUserCampaignInterestedReceiptDto(
  receipt: UserCampaignInterestedReceiptInput,
) {
  const plainUserCampaignInterestedReceiptDto: UserCampaignInterestedReceiptDto =
    {
      id: receipt.id,
      campaignSlug: receipt.campaignSlug,
      timestamp: receipt.timestamp,
      user: toBasicUserDto(receipt.user),
      expressedAmount: receipt.expressedAmount,
    };

  return plainToInstance(
    UserCampaignInterestedReceiptDto,
    plainUserCampaignInterestedReceiptDto,
  );
}

export function toUserCampaignInterestedReceiptDtoArray(
  inputs: UserCampaignInterestedReceiptInput[],
) {
  return inputs.map(toUserCampaignInterestedReceiptDto);
}

export type PaginatedUserCampaignInterestedReceiptInput = {
  totalItems: number;
  data: UserCampaignInterestedReceiptInput[];
};

export function toPaginatedUserCampaignInterestedReceiptDto(
  input: PaginatedUserCampaignInterestedReceiptInput,
) {
  const plainPaginatedUserCampaignInterestedReceiptDto: PaginatedResponseDto<UserCampaignInterestedReceiptDto> =
    {
      totalItems: input.totalItems,
      data: toUserCampaignInterestedReceiptDtoArray(input.data),
    };

  const paginatedUserCampaignInterestedReceiptDto = plainToInstance(
    PaginatedResponseDto<UserCampaignInterestedReceiptDto>,
    plainPaginatedUserCampaignInterestedReceiptDto,
  );
  return paginatedUserCampaignInterestedReceiptDto;
}
