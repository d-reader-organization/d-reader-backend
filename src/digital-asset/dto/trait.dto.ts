import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';

export class TraitDto {
  @IsString()
  name: string;

  @IsString()
  value: string;
}

export type TraitInput = {
  name: string;
  value: string;
};

export function toTraitDto(input: TraitInput) {
  const plainTraitDto: TraitDto = {
    name: input.name,
    value: input.value,
  };

  const traitDto = plainToInstance(TraitDto, plainTraitDto);
  return traitDto;
}

export function toTraitDtoArray(traits: TraitInput[]) {
  return traits.map((trait) => toTraitDto(trait));
}
