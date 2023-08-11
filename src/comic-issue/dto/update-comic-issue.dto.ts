import { OmitType, PartialType } from '@nestjs/swagger';
import {
  CreateComicIssueBodyDto,
  CreateComicIssueFilesDto,
} from './create-comic-issue.dto';

export class UpdateComicIssueDto extends PartialType(
  OmitType(CreateComicIssueBodyDto, ['comicSlug', 'title', 'slug'] as const),
) {}

export class UpdateComicIssueFilesDto extends PartialType(
  CreateComicIssueFilesDto,
) {}
