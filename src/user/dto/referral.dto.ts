import { ifDefined } from 'src/utils/lodash';
import { BasicUserDto } from './basic-user-dto';
import { getPublicUrl } from 'src/aws/s3client';
import { User } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

export class ReferralDto extends BasicUserDto {
  referredAt: Date;
}

export function toReferralDto(user: User) {
  const plainReferralDto: ReferralDto = {
    id: user.id,
    avatar: ifDefined(user.avatar, getPublicUrl),
    username: user.username,
    displayName: user.displayName,
    referredAt: user.referredAt,
  };

  const referralDto = plainToInstance(ReferralDto, plainReferralDto);
  return referralDto;
}

export const toReferralDtoArray = (users: User[]) => {
  return users.map(toReferralDto);
};
