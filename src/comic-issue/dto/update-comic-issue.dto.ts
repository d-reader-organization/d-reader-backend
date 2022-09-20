import { PartialType } from '@nestjs/swagger';
import {
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
} from './create-comic-issue.dto';

export class UpdateComicIssueDto extends PartialType(CreateComicIssueDto) {}

export class UpdateComicIssueFilesDto extends PartialType(
  CreateComicIssueFilesDto,
) {}
