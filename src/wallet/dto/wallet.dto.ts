import { IsEnum, IsString } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { Exclude, Expose } from 'class-transformer';
import { Presignable } from 'src/types/presignable';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

@Exclude()
export class WalletDto extends Presignable<WalletDto> {
  @Expose()
  @IsSolanaAddress()
  address: string;

  @Expose()
  @IsString()
  label: string;

  @Expose()
  @IsString()
  avatar: string;

  @Expose()
  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role;

  protected async presign(): Promise<WalletDto> {
    return await super.presign(this, ['avatar']);
  }

  static async presignUrls(input: WalletDto): Promise<WalletDto>;
  static async presignUrls(input: WalletDto[]): Promise<WalletDto[]>;
  static async presignUrls(
    input: WalletDto | WalletDto[],
  ): Promise<WalletDto | WalletDto[]> {
    if (Array.isArray(input)) {
      return await Promise.all(input.map((obj) => obj.presign()));
    } else return await input.presign();
  }
}
