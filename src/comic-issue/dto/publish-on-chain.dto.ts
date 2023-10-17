import { PickType } from '@nestjs/swagger';
import { CreateComicIssueDto } from './create-comic-issue.dto';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { IsLamport } from 'src/decorators/IsLamport';

export class PublishOnChainDto extends PickType(CreateComicIssueDto, [
  'sellerFeeBasisPoints',
  'royaltyWallets',
  'creatorAddress',
]) {
  @IsOptional()
  @IsLamport()
  mintPrice?: number;

  @Min(0)
  // @IsDivisibleBy(100)
  @IsNumber()
  supply?: number;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  publicMintLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  freezePeriod?: number;

  @IsOptional()
  @IsBoolean()
  shouldBePublic?: boolean;
}
