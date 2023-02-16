import { IsBoolean } from 'class-validator';

export class WalletCreatorStatsDto {
  @IsBoolean()
  isFollowing: boolean;
}
