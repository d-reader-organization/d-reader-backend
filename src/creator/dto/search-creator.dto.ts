import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsPositive, IsUrl, MaxLength } from 'class-validator';
import { getPublicUrl } from '../../aws/s3client';
import { SearchCreator } from './types';
import { DISPLAY_NAME_MAX_SIZE } from '../../constants';

export class SearchCreatorDto {
  @IsNotEmpty()
  @MaxLength(54)
  handle: string;

  @IsUrl()
  avatar: string;

  @IsPositive()
  issuesCount: number;

  @IsNotEmpty()
  @MaxLength(DISPLAY_NAME_MAX_SIZE)
  displayName: string;
}

export function toSearchCreatorDto(creator: SearchCreator) {
  const plainCreatorDto: SearchCreatorDto = {
    handle: creator.handle,
    avatar: getPublicUrl(creator.avatar),
    issuesCount: creator.issuesCount,
    displayName: creator.displayName,
  };

  const creatorDto = plainToInstance(SearchCreatorDto, plainCreatorDto);
  return creatorDto;
}

export const toSearchCreatorDtoArray = (creators: SearchCreator[]) => {
  return creators.map(toSearchCreatorDto);
};
