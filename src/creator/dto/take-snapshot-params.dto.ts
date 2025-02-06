import { IsDate, IsOptional } from 'class-validator';
import { TransformDateStringToDate } from 'src/utils/transform';

export class TakeSnapshotParams {
  @IsOptional()
  @TransformDateStringToDate()
  @IsDate()
  date?: Date;
}
