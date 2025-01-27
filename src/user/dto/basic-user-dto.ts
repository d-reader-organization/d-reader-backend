import { plainToInstance } from 'class-transformer';
import { UserDto } from './user.dto';
import { User } from '@prisma/client';
import { ifDefined } from 'src/utils/lodash';
import { getPublicUrl } from 'src/aws/s3client';

export class BasicUserDto {
  id: UserDto['id'];
  avatar: UserDto['avatar'];
  username: UserDto['username'];
  displayName: UserDto['displayName'];
}

export function toBasicUserDto(user: User) {
  const plainUserDto: BasicUserDto = {
    id: user.id,
    avatar: ifDefined(user.avatar, getPublicUrl),
    username: user.username,
    displayName: user.displayName,
  };

  const basicUserDto = plainToInstance(BasicUserDto, plainUserDto);
  return basicUserDto;
}

export const toBasicUsersDtoArray = (users: User[]) => {
  return users.map(toBasicUserDto);
};
