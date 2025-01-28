import { IsArray, IsDateString, IsNumber, IsString } from 'class-validator';
import { IndexCoreAssetReturnType } from './types';
import { plainToInstance, Type } from 'class-transformer';
import { PickType } from '@nestjs/swagger';
import { getPublicUrl } from '../../../aws/s3client';
import { BasicUserDto, toBasicUserDto } from '../../../user/dto/basic-user-dto';
import { ifDefined } from '../../../utils/lodash';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { CollectibleComicDto } from 'src/digital-asset/dto/collectible-comic.dto';
import { CandyMachineReceipt, User } from '@prisma/client';

export class PartialCollectibleComicDto extends PickType(CollectibleComicDto, [
  'address',
  'name',
  'image',
  'isSigned',
  'isUsed',
  'rarity',
]) {}

export class CollectibleComicMintEventDto {
  @IsArray()
  @Type(() => PartialCollectibleComicDto)
  assets: PartialCollectibleComicDto[];

  @Type(() => BasicUserDto)
  buyer?: BasicUserDto;

  @IsSolanaAddress()
  buyerAddress: string;

  @IsString()
  candyMachineAddress: string;

  @IsNumber()
  price: number;

  @IsDateString()
  timestamp: string;

  @IsString()
  splTokenAddress: string;
}

export type CollectibleComicMintEventInput = CandyMachineReceipt & {
  user: User;
  comicIssueAssets: IndexCoreAssetReturnType[];
};

export async function toCollectibleComicMintEventDto(
  eventData: CollectibleComicMintEventInput,
) {
  const { comicIssueAssets, user, ...data } = eventData;

  const assets: PartialCollectibleComicDto[] = comicIssueAssets.map(
    (asset) => ({
      address: asset.digitalAsset.address,
      name: asset.name,
      image: getPublicUrl(asset.image),
      isSigned: asset.metadata.isSigned,
      isUsed: asset.metadata.isUsed,
      rarity: asset.metadata.rarity,
    }),
  );

  const plainCollectibleComicMintEventDto: CollectibleComicMintEventDto = {
    assets,
    buyer: ifDefined(user, toBasicUserDto),
    buyerAddress: data.buyerAddress,
    candyMachineAddress: data.candyMachineAddress,
    price: Number(data.price),
    timestamp: data.timestamp.toISOString(),
    splTokenAddress: data.splTokenAddress,
  };

  const collectibleComicMintEventDto = plainToInstance(
    CollectibleComicMintEventDto,
    plainCollectibleComicMintEventDto,
  );
  return collectibleComicMintEventDto;
}
