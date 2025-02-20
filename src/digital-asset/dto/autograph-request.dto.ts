import { BasicUserDto, toBasicUserDto } from 'src/user/dto/basic-user-dto';
import {
  CollectibleComicDto,
  CollectibleComicInput,
  toCollectibleComicDto,
} from './collectible-comic.dto';
import { SignatureRequestStatus, User } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/types/paginated-response.dto';

export class AutographRequestDto {
  @Type(() => CollectibleComicDto)
  collectibleComic: CollectibleComicDto;

  @Type(() => BasicUserDto)
  user: BasicUserDto;

  @IsDate()
  requestedAt: Date;

  @IsOptional()
  @IsDate()
  resolvedAt?: Date;

  @ApiProperty({ enum: SignatureRequestStatus })
  @IsEnum(SignatureRequestStatus)
  status: SignatureRequestStatus;
}

export type AutographRequestInput = {
  user: User;
  collectibleComic: CollectibleComicInput;
  requestedAt: Date;
  resolvedAt?: Date;
  status: SignatureRequestStatus;
};

export const toAutographRequestDto = (input: AutographRequestInput) => {
  const plainAutographRequesDto: AutographRequestDto = {
    user: toBasicUserDto(input.user),
    collectibleComic: toCollectibleComicDto(input.collectibleComic),
    resolvedAt: input.resolvedAt,
    requestedAt: input.resolvedAt,
    status: input.status,
  };

  const autographRequestDto = plainToInstance(
    AutographRequestDto,
    plainAutographRequesDto,
  );
  return autographRequestDto;
};

export const toAutographRequestDtoArray = (inputs: AutographRequestInput[]) => {
  return inputs.map(toAutographRequestDto);
};

export type PaginatedAutographRequestInput = {
  totalItems: number;
  requests: AutographRequestInput[];
};

export const toPaginatedAutographRequestDto = (
  input: PaginatedAutographRequestInput,
) => {
  const plainAutographRequestDto: PaginatedResponseDto<AutographRequestDto> = {
    totalItems: input.totalItems,
    data: toAutographRequestDtoArray(input.requests),
  };

  const paginatedAutographRequestDto = plainToInstance(
    PaginatedResponseDto<AutographRequestDto>,
    plainAutographRequestDto,
  );
  return paginatedAutographRequestDto;
};
