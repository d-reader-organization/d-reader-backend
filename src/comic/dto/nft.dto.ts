import { IsHash, IsNotEmpty, IsPositive } from 'class-validator';

export class NftDto {
  @IsHash('sha256')
  @IsNotEmpty()
  mint: string;

  @IsPositive()
  comicIssueId: number;
}
