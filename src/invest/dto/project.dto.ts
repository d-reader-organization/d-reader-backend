import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ProjectDto {
  @IsString()
  slug: string;

  @Min(0)
  @IsNumber()
  countOfUserExpressedInterest: number;

  @IsOptional()
  @IsBoolean()
  isUserInterested?: boolean;
}

export type ProjectInput = {
  slug: string;
  countOfUserExpressedInterest: number;
  isUserInterested?: boolean;
};

export function toProjectDto(projectInput: ProjectInput) {
  const plainProjectDto: ProjectDto = {
    slug: projectInput.slug,
    countOfUserExpressedInterest: projectInput.countOfUserExpressedInterest,
    isUserInterested: projectInput.isUserInterested,
  };

  return plainToInstance(ProjectDto, plainProjectDto);
}

export function toProjectDtoArray(projectInputArray: ProjectInput[]) {
  return projectInputArray.map(toProjectDto);
}
