import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateWheelDto } from './create-wheel.dto';
import { AddRewardDto } from './add-reward.dto';

export class UpdateWheelDto extends PartialType(CreateWheelDto) {}

export class UpdateRewardDto extends OmitType(PartialType(AddRewardDto), [
  'drops',
]) {}
