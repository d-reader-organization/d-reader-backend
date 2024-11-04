import { IsNumber, IsString } from 'class-validator';
import { TransformStringToNumber } from 'src/utils/transform';

export class ExpressInterestDto {
  @IsString()
  transactionSignature: string;

  @TransformStringToNumber()
  @IsNumber()
  projectId: number;
}
