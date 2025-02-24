import { User, UserCampaignInterest } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';
import { PaginatedResponseDto } from 'src/types/paginated-response.dto';
import { BasicUserDto, toBasicUserDto } from 'src/user/dto/basic-user-dto';

export class UserCampaignInteresttDto {
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

export type UserCampaignInterestInput = UserCampaignInterest & {
  user: User;
};

export function toUserCampaignInteresttDto(receipt: UserCampaignInterestInput) {
  const plainUserCampaignInterestDto: UserCampaignInteresttDto = {
    id: receipt.id,
    campaignSlug: receipt.campaignSlug,
    timestamp: receipt.timestamp,
    user: toBasicUserDto(receipt.user),
    expressedAmount: receipt.expressedAmount,
  };

  return plainToInstance(
    UserCampaignInteresttDto,
    plainUserCampaignInterestDto,
  );
}

export function toUserCampaignInterestDtoArray(
  inputs: UserCampaignInterestInput[],
) {
  return inputs.map(toUserCampaignInteresttDto);
}

export type PaginatedUserCampaignInterestInput = {
  totalItems: number;
  data: UserCampaignInterestInput[];
};

export function toPaginatedUserCampaignInterestDto(
  input: PaginatedUserCampaignInterestInput,
) {
  const plainPaginatedUserCampaignInterestDto: PaginatedResponseDto<UserCampaignInteresttDto> =
    {
      totalItems: input.totalItems,
      data: toUserCampaignInterestDtoArray(input.data),
    };

  const paginatedUserCampaignInterestDto = plainToInstance(
    PaginatedResponseDto<UserCampaignInteresttDto>,
    plainPaginatedUserCampaignInterestDto,
  );
  return paginatedUserCampaignInterestDto;
}
