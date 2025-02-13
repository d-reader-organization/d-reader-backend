import { plainToInstance } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProjectDto {
  @IsString()
  slug: string;

  @Min(0)
  @IsNumber()
  countOfUserExpressedInterest: number;

  @IsOptional()
  @IsNumber()
  expectedPledgedAmount?: number;

  @IsOptional()
  @IsNumber()
  expressedAmount?: number;
}

export type ProjectInput = {
  slug: string;
  countOfUserExpressedInterest: number;
  expectedPledgedAmount?: number;
  expressedAmount?: number;
};

export function toProjectDto(projectInput: ProjectInput) {
  const plainProjectDto: ProjectDto = {
    slug: projectInput.slug,
    countOfUserExpressedInterest: projectInput.countOfUserExpressedInterest,
    expressedAmount: projectInput.expressedAmount,
    expectedPledgedAmount: projectInput.expectedPledgedAmount,
  };

  return plainToInstance(ProjectDto, plainProjectDto);
}

export function toProjectDtoArray(projectInputArray: ProjectInput[]) {
  return projectInputArray.map(toProjectDto);
}
