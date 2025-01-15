import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';

export class AttributeDto {
  @IsString()
  trait: string;

  @IsString()
  value: string;
}

export type AttributeInput = {
  trait: string;
  value: string;
};

export function toAttributeDto(attribute: AttributeInput) {
  const plainAttributeDto: AttributeDto = {
    trait: attribute.trait,
    value: attribute.value,
  };

  const attributeDto = plainToInstance(AttributeDto, plainAttributeDto);
  return attributeDto;
}

export function toAttributeDtoArray(attributes: AttributeInput[]) {
  return attributes.map((attribute) => toAttributeDto(attribute));
}
