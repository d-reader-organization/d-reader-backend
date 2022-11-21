import { IsOptional, IsString } from 'class-validator';

export class CreatorFilterParams {
  @IsOptional()
  @IsString()
  nameSubstring?: string;

  // TODO v1: add filtering by creator genres?
}
