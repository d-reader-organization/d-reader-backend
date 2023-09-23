import { PickType } from '@nestjs/swagger';
import { CreatorDto } from './creator.dto';
import { Creator } from '@prisma/client';
import { getPublicUrl } from 'src/aws/s3client';
import { plainToInstance } from 'class-transformer';

export class PartialCreatorDto extends PickType(CreatorDto, [
  'name',
  'slug',
  'isVerified',
  'avatar',
]) {}

export function toPartialCreatorDto(creator: Creator) {
  const plainCreatorDto: PartialCreatorDto = {
    name: creator.name,
    slug: creator.slug,
    isVerified: !!creator.verifiedAt,
    avatar: getPublicUrl(creator.avatar),
  };

  const creatorDto = plainToInstance(PartialCreatorDto, plainCreatorDto);
  return creatorDto;
}

export const toPartialCreatorDtoArray = (creators: Creator[]) => {
  return creators.map(toPartialCreatorDto);
};
