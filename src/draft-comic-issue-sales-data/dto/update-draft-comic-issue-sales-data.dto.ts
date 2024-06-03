import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDraftComicIssueSalesDataDto } from './create-draft-comic-issue-sales-data.dto';

export class UpdateDraftComicIssueSalesDataDto extends PartialType(
  OmitType(CreateDraftComicIssueSalesDataDto, ['comicIssueId'] as const),
) {}
