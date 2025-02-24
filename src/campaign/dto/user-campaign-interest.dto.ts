import { CampaignReward, User, UserCampaignInterest } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsDate, IsNumber } from 'class-validator';
import { PaginatedResponseDto } from 'src/types/paginated-response.dto';
import { BasicUserDto, toBasicUserDto } from 'src/user/dto/basic-user-dto';

export class UserCampaignInteresttDto {
  @IsNumber()
  id: number;

  @IsDate()
  expressedInterestAt: Date;

  @Type(() => BasicUserDto)
  user: BasicUserDto;

  @IsNumber()
  expressedAmount: number;
}

export type UserCampaignInterestInput = UserCampaignInterest & {
  user: User;
  reward: Pick<CampaignReward, 'price'>;
};

export function toUserCampaignInteresttDto(input: UserCampaignInterestInput) {
  const plainUserCampaignInterestDto: UserCampaignInteresttDto = {
    id: input.id,
    expressedInterestAt: input.expressedInterestAt,
    user: toBasicUserDto(input.user),
    expressedAmount: input.reward.price,
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
