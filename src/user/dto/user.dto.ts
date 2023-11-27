import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsPositive,
  IsString,
  IsUrl,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { User, Role } from '@prisma/client';
import { getPublicUrl } from '../../aws/s3client';

export class UserDto {
  @IsPositive()
  id: number;

  @IsEmail()
  email: string;

  @IsBoolean()
  isEmailVerified: boolean;

  @IsBoolean()
  hasBetaAccess: boolean;

  @IsString()
  name: string;

  @IsUrl()
  avatar: string;

  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role;

  //TODO: referrer: string
}

export function toUserDto(user: User) {
  const plainUserDto: UserDto = {
    id: user.id,
    email: user.email,
    isEmailVerified: !!user.emailVerifiedAt,
    hasBetaAccess: !!user.referredAt,
    name: user.name,
    avatar: getPublicUrl(user.avatar),
    role: user.role,
  };

  const userDto = plainToInstance(UserDto, plainUserDto);
  return userDto;
}

export const toUserDtoArray = (users: User[]) => {
  return users.map(toUserDto);
};
