import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsPositive, IsUrl, MaxLength } from 'class-validator';
import { getPublicUrl } from '../../aws/s3client';
import { SearchCreator } from './types';

export class SearchCreatorDto {
  @IsNotEmpty()
  @MaxLength(54)
  handle: string;

  @IsUrl()
  avatar: string;

  @IsPositive()
  issuesCount: number;
}

export function toSearchCreatorDto(creator: SearchCreator) {
  const plainCreatorDto: SearchCreatorDto = {
    handle: creator.handle,
    avatar: getPublicUrl(creator.avatar),
    issuesCount: creator.issuesCount,
  };

  const creatorDto = plainToInstance(SearchCreatorDto, plainCreatorDto);
  return creatorDto;
}

export const toSearchCreatorDtoArray = (creators: SearchCreator[]) => {
  return creators.map(toSearchCreatorDto);
};
