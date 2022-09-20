import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsPositive, IsString } from 'class-validator';
// import { ComicIssueDto } from 'src/comic-issue/dto/comic-issue.dto';

@Exclude()
export class NFTDto {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsString()
  // TODO v1.1: @IsHash()
  @IsNotEmpty()
  mint: string;

  @Expose()
  @IsPositive()
  comicIssueId: number;

  // @Expose()
  // @Type(() => ComicIssueDto)
  // comicIssue: ComicIssueDto;
}
