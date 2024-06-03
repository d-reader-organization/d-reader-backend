import { SplToken } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsInt, IsPositive, IsString, IsUrl } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';

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

  @IsUrl()
  icon: string;
}

export const toSplToken = (token: SplToken): SplTokenDto => {
  const plainSplTokentDto = {
    id: token.id,
    name: token.name,
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    priority: token.priority,
    icon: getPublicUrl(token.icon),
  };
  return plainToInstance(SplTokenDto, plainSplTokentDto);
};

export const toSplTokenArray = (tokenArray: SplToken[]) => {
  return tokenArray.map(toSplToken);
};
