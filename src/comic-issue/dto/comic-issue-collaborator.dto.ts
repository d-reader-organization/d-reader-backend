import { ApiProperty } from '@nestjs/swagger';
import { CollaboratorRole, ComicIssueCollaborator } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsString } from 'class-validator';

export class ComicIssueCollaboratorDto {
  @IsEnum(CollaboratorRole)
  @ApiProperty({ enum: CollaboratorRole })
  role: CollaboratorRole;

  @IsString()
  name: string;
}

export function toComicIssueCollaboratorDto(
  collaborator: ComicIssueCollaborator,
) {
  const plainCollaboratorDto: ComicIssueCollaboratorDto = {
    name: collaborator.name,
    role: collaborator.role,
  };

  const collaboratorDto = plainToInstance(
    ComicIssueCollaboratorDto,
    plainCollaboratorDto,
  );
  return collaboratorDto;
}

export const toComicIssueCollaboratorDtoArray = (
  collaborators: ComicIssueCollaborator[],
) => {
  return collaborators.map(toComicIssueCollaboratorDto);
};
