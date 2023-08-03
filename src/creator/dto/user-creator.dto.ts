import { IsBoolean } from 'class-validator';

export class UserCreatorStatsDto {
  @IsBoolean()
  isFollowing: boolean;
}
