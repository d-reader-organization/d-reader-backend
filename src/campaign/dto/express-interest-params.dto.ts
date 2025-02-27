import { IsOptional, IsString } from 'class-validator';

export class ExpressInterestParams {
  @IsOptional()
  @IsString()
  ref?: string;
}
