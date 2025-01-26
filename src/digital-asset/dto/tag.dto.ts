import { DigitalAssetTag } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class DigitalAssetTagDto {
  @IsNumber()
  id: number;

  @IsString()
  value: string;
}

export function toDigitalAssetTagDto(tag: DigitalAssetTag) {
  const plainDigitalAssetTagDto: DigitalAssetTagDto = {
    id: tag.id,
    value: tag.value,
  };

  const digitalAssetTagDto = plainToInstance(
    DigitalAssetTagDto,
    plainDigitalAssetTagDto,
  );
  return digitalAssetTagDto;
}

export function toDigitalAssetTagDtoArray(tags: DigitalAssetTag[]) {
  return tags.map((tag) => toDigitalAssetTagDto(tag));
}
