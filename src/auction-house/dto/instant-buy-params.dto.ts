import { ApiProperty } from '@nestjs/swagger';
import { PublicKey } from '@solana/web3.js';
import { Transform } from 'class-transformer';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
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
    if (value) return new PublicKey(value);
  })
  seller?: PublicKey;

  @IsString()
  @IsOptional()
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => {
    if (value) return new PublicKey(value);
  })
  tokenAccount?: PublicKey;
}

export class BuyParamsArray {
  @ApiProperty({
    isArray: true,
    type: InstantBuyParams,
  })
  instantBuyParams: InstantBuyParams[];
}
