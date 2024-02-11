import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ArraySolanaAddress } from '../../decorators/IsSolanaAddress';

export class AddAllowListParams {
  @IsNotEmpty()
  @IsString()
  candyMachineAddress: string;

  @IsNotEmpty()
  @IsString()
  label: string;

  @IsArray()
  @ArraySolanaAddress()
  @ApiProperty({ type: String })
  @Type(() => String)
  allowList: string[];
}
