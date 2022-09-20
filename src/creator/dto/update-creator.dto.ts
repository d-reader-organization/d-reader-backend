import { PartialType } from '@nestjs/swagger';
import { CreateCreatorDto } from './create-creator.dto';

export class UpdateCreatorDto extends PartialType(CreateCreatorDto) {}
