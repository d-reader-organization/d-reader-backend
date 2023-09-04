import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import { Transform } from 'class-transformer';

export class UpdateComicIssueDto extends PartialType(
  OmitType(CreateComicIssueDto, ['comicSlug', 'title', 'slug'] as const),
) {}

export class UpdateComicIssueFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  signature?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  pdf?: Express.Multer.File | null;
}
