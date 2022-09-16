import { PartialType } from '@nestjs/swagger';
import {
  CreateCollectionDto,
  CreateCollectionFilesDto,
} from './create-collection.dto';

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}

export class UpdateCollectionFilesDto extends PartialType(
  CreateCollectionFilesDto,
) {}
