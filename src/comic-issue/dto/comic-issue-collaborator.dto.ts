import { ApiProperty } from '@nestjs/swagger';
import { CollaboratorRole } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class ComicIssueCollaboratorDto {
  @IsEnum(CollaboratorRole)
  @ApiProperty({ enum: CollaboratorRole })
  role: CollaboratorRole;

  @IsString()
  name: string;
}
