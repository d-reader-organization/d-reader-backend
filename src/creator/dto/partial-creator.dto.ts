import { PickType } from '@nestjs/swagger';
import { CreatorChannelDto } from './creator.dto';
import { CreatorChannel } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { plainToInstance } from 'class-transformer';

export class PartialCreatorDto extends PickType(CreatorChannelDto, [
  'handle',
  'isVerified',
  'avatar',
]) {}

export function toPartialCreatorDto(creator: CreatorChannel) {
  const plainCreatorDto: PartialCreatorDto = {
    handle: creator.handle,
    isVerified: !!creator.verifiedAt,
    avatar: getPublicUrl(creator.avatar),
  };

  const creatorDto = plainToInstance(PartialCreatorDto, plainCreatorDto);
  return creatorDto;
}

export const toPartialCreatorDtoArray = (creators: CreatorChannel[]) => {
  return creators.map(toPartialCreatorDto);
};
