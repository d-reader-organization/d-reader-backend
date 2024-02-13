import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AddAllowListDto {
  @IsNotEmpty()
  @IsString()
  candyMachineAddress: string;

  @IsNotEmpty()
  @IsString()
  label: string;

  @IsArray()
  @ApiProperty({ type: [String] })
  @Type(() => String)
  allowList: string[];
}
