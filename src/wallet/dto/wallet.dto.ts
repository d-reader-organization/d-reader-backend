import { IsEnum, IsPositive, IsString, MaxLength } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { Exclude, Expose } from 'class-transformer';
import { getReadUrl } from 'src/aws/s3client';
import { Role } from '@prisma/client';

@Exclude()
export class WalletDto {
  @Expose()
  @IsPositive()
  id: number;

  @Expose()
  @IsSolanaAddress()
  address: string;

  @Expose()
  @MaxLength(24)
  label: string;

  @Expose()
  @IsString()
  avatar: string;

  @Expose()
  @IsEnum(Role)
  role: Role;

  // presignUrls = async () => {
  //   this.avatar = await getReadUrl(this.avatar);
  //   return this;
  // };

  static async presignUrls(input: WalletDto): Promise<WalletDto>;
  static async presignUrls(input: WalletDto[]): Promise<WalletDto[]>;
  static async presignUrls(
    input: WalletDto | WalletDto[],
  ): Promise<WalletDto | WalletDto[]> {
    if (Array.isArray(input)) {
      input = await Promise.all(
        input.map(async (obj) => {
          obj.avatar = await getReadUrl(obj.avatar);
          return obj;
        }),
      );
      return input;
    } else {
      input.avatar = await getReadUrl(input.avatar);
      return input;
    }
  }
}
