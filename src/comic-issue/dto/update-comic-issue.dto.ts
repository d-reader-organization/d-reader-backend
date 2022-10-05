import { OmitType, PartialType } from '@nestjs/swagger';
import {
  CreateComicIssueDto,
  CreateComicIssueFilesDto,
} from './create-comic-issue.dto';

export class UpdateComicIssueDto extends PartialType(
  OmitType(CreateComicIssueDto, ['comicSlug', 'title', 'slug'] as const),
) {}

export class UpdateComicIssueFilesDto extends PartialType(
  CreateComicIssueFilesDto,
) {}
