import { ApiProperty } from '@nestjs/swagger';
import { PublicKey } from '@solana/web3.js';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNumberString, IsOptional, IsString } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class InstantBuyParams {
  
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => new PublicKey(value))
  mintAccount: PublicKey;

  @IsNumberString()
  price: number;

  @IsSolanaAddress()
  @IsOptional()
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => {
    if(value)return new PublicKey(value);
  })
  seller?: PublicKey;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => {
    if(value)return new PublicKey(value);
  })
  tokenAccount?: PublicKey;
}

export class InstantBuyParamsArray {
  @IsArray()
  @Type(() => InstantBuyParams)
  @ApiProperty({ type: [InstantBuyParams] })
  instantBuyParams: InstantBuyParams[];
}
