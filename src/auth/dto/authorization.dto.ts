import { ApiProperty, PickType } from '@nestjs/swagger';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Role } from '@prisma/client';

export class Authorization {
  accessToken: string;
  refreshToken: string;
}

export class TokenPayload extends PickType(Wallet, [
  'address',
  'role',
  'nonce',
] as const) {}

export class JwtDto {
  address: string;
  nonce: string;
  @ApiProperty({ enum: Role })
  role: Role;
  /**
   * Issued at
   */
  iat: number;
  /**
   * Expiration time
   */
  exp: number;
}
