import { SplToken } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsPositive, IsString } from 'class-validator';

export class SplTokenDto {
  @IsPositive()
  id: number;

  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsInt()
  decimals: number;

  @IsString()
  symbol: string;

  @IsInt()
  priority: number;

  @IsString()
  icon: string;
}

export const toSplToken = (token: SplToken): SplTokenDto => {
  const plainSplTokentDto = {
    name: token.name,
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    priority: token.priority,
    icon: token.icon,
  };
  return plainToInstance(SplTokenDto, plainSplTokentDto);
};

export const toSplTokenArray = (tokenArray: SplToken[]) => {
  return tokenArray.map(toSplToken);
};
