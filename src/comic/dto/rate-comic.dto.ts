import { IsIntRange } from '../../decorators/IsIntRange';

export class RateComicDto {
  @IsIntRange(1, 5)
  rating: number;
}
