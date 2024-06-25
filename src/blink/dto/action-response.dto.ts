import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class ActionResponseDto {
  @IsString()
  transaction: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export function toActionResponseDto(transaction: string) {
  const plainActionResponse = { transaction };
  return plainToInstance(ActionResponseDto, plainActionResponse);
}
