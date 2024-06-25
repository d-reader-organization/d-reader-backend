import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ActionSpecGetResponse } from './types';

export class ActionErrorDto {
  @IsString()
  message: string;
}

export class ParameterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  label?: string;
}

export class ActionDto {
  @IsString()
  href: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsArray()
  @Type(() => ParameterDto)
  @ApiProperty({ type: [ParameterDto] })
  parameters?: ParameterDto[];
}

export class LinkedActionDto {
  @IsArray()
  @Type(() => ActionDto)
  @ApiProperty({ type: [ActionDto] })
  actions: ActionDto[];
}

export class ActionSpecDto {
  @IsString()
  icon: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  @Type(() => LinkedActionDto)
  links?: LinkedActionDto;

  @Type(() => LinkedActionDto)
  error?: ActionErrorDto;
}

export function toActionSpecDto(spec: ActionSpecGetResponse) {
  const actions = spec.links.actions.map((action) => {
    const actionDto: ActionDto = {
      href: action.href,
      label: action.label,
      parameters: action.parameters,
    };
    return actionDto;
  });

  const plainActionSpecDto: ActionSpecDto = {
    icon: spec.icon,
    title: spec.title,
    description: spec.description,
    label: spec.label,
    disabled: spec.disabled,
    links: { actions },
    error: spec.error,
  };
  return plainToInstance(ActionSpecDto, plainActionSpecDto);
}
