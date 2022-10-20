import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsPositive, IsString } from 'class-validator';
// import { ComicIssueDto } from 'src/comic-issue/dto/comic-issue.dto';

@Exclude()
export class NftDto {
  @Expose()
  @IsString()
  // TODO v1.2: @IsHash()
  @IsNotEmpty()
  mint: string;

  @Expose()
  @IsPositive()
  comicIssueId: number;

  // @Expose()
  // @IsArray()
  // @Type(() => ComicIssueDto)
  // comicIssue: ComicIssueDto;
}
