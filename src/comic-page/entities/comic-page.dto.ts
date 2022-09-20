import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsPositive, IsString, IsNotEmpty } from 'class-validator';
// import { ComicIssueDto } from 'src/comic-issue/dto/comic-issue.dto';

@Exclude()
export class ComicPageDto {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsPositive()
  pageNumber: number;

  @Expose()
  @IsBoolean()
  isPreviewable: boolean;

  @Expose()
  @IsString()
  @IsNotEmpty()
  image: string;

  @Expose()
  @IsString()
  altImage: string;

  @Expose()
  @IsPositive()
  comicIssueId: number;

  // @Expose()
  // @Type(() => ComicIssueDto)
  // comicIssue: ComicIssueDto;
}
