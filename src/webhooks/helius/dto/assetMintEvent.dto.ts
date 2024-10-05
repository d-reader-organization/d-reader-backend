import { IsArray } from 'class-validator';
import {
  CandyMachineReceiptDto,
  CandyMachineReceiptInput,
} from '../../../candy-machine/dto/candy-machine-receipt.dto';
import { IndexCoreAssetReturnType } from './types';
import { plainToInstance, Type } from 'class-transformer';
import { AssetDto } from 'src/digital-asset/dto/digital-asset.dto';
import { OmitType, PickType } from '@nestjs/swagger';
import { toBuyerDto } from 'src/auction-house/dto/types/buyer.dto';

export class PartialAssetMintDto extends PickType(AssetDto, [
  'address',
  'name',
  'image',
  'isSigned',
  'isUsed',
  'rarity',
]) {}

export class AssetMintEventDto extends OmitType(CandyMachineReceiptDto, [
  'assets',
] as const) {
  @IsArray()
  @Type(() => PartialAssetMintDto)
  assets: PartialAssetMintDto[];
}

export async function toAssetMintEventDto(eventData: {
  receipt: CandyMachineReceiptInput;
  comicIssueAssets: IndexCoreAssetReturnType[];
}) {
  const { receipt, comicIssueAssets } = eventData;
  const assets: PartialAssetMintDto[] = comicIssueAssets.map((asset) => ({
    address: asset.digitalAsset.address,
    name: asset.name,
    image: asset.image,
    isSigned: asset.metadata.isSigned,
    isUsed: asset.metadata.isUsed,
    rarity: asset.metadata.rarity,
  }));

  const plainAssetMintEventDto: AssetMintEventDto = {
    nft: {
      address: receipt.collectibleComics[0].address,
      name: receipt.collectibleComics[0].name,
    },
    asset: {
      address: receipt.collectibleComics[0].address,
      name: receipt.collectibleComics[0].name,
    },
    assets,
    buyer: await toBuyerDto(receipt.buyer),
    candyMachineAddress: receipt.candyMachineAddress,
    price: Number(receipt.price),
    timestamp: receipt.timestamp.toISOString(),
    splTokenAddress: receipt.splTokenAddress,
  };

  const receiptDto = plainToInstance(AssetMintEventDto, plainAssetMintEventDto);
  return receiptDto;
}
