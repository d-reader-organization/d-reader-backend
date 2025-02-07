import { ApiProperty } from '@nestjs/swagger';
import { CreatorSnapshot, CreatorSnapshotType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsDate, IsEnum, IsNumber } from 'class-validator';

export class CreatorSnapshotDto {
  @IsNumber()
  id: number;

  @IsDate()
  date: Date;

  @IsNumber()
  value: number;

  @IsEnum(CreatorSnapshotType)
  @ApiProperty({ enum: CreatorSnapshotType })
  type: CreatorSnapshotType;
}

export function toCreatorSnapshotDto(input: CreatorSnapshot) {
  const plainCreatorSnapshotDto: CreatorSnapshotDto = {
    id: input.id,
    date: input.timestamp,
    value: input.value,
    type: input.type,
  };

  const creatorSnapshotDto: CreatorSnapshotDto = plainToInstance(
    CreatorSnapshotDto,
    plainCreatorSnapshotDto,
  );
  return creatorSnapshotDto;
}

export function toCreatorSnapshotDtoArray(inputs: CreatorSnapshot[]) {
  return inputs.map(toCreatorSnapshotDto);
}
