import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
} from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { User, Role, Device } from '@prisma/client';
import { getPublicUrl } from '../../aws/s3client';
import { With } from 'src/types/shared';

export class UserDto {
  @IsPositive()
  id: number;

  @IsEmail()
  email: string;

  @IsBoolean()
  isEmailVerified: boolean;

  @IsBoolean()
  hasBetaAccess: boolean;

  @IsInt()
  referralsRemaining: number;

  @IsString()
  name: string;

  @IsUrl()
  avatar: string;

  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role;

  @IsArray()
  @IsOptional()
  @ApiProperty({ type: String })
  @Type(() => String)
  deviceTokens?: string[];

  @IsBoolean()
  hasPassword: boolean;
}

type WithDeviceIds = { devices?: Device[] };

export type UserInput = With<[User, WithDeviceIds]>;

export function toUserDto(user: UserInput) {
  const plainUserDto: UserDto = {
    id: user.id,
    email: user.email,
    isEmailVerified: !!user.emailVerifiedAt,
    hasBetaAccess: !!user.referredAt,
    referralsRemaining: user.referralsRemaining,
    name: user.name,
    avatar: getPublicUrl(user.avatar),
    role: user.role,
    deviceTokens: user.devices?.map((device) => device.token) ?? [],
    hasPassword: user.password.length > 0,
  };

  const userDto = plainToInstance(UserDto, plainUserDto);
  return userDto;
}

export const toUserDtoArray = (users: UserInput[]) => {
  return users.map(toUserDto);
};
