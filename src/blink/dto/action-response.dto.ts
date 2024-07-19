import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class ActionResponseDto {
  @IsString()
  transaction: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export function toActionResponseDto(transaction: string, message?: string) {
  const plainActionResponse = { transaction, message };
  return plainToInstance(ActionResponseDto, plainActionResponse);
}
