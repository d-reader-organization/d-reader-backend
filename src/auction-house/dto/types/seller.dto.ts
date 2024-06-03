import { BuyerDto, toBuyerDto, toBuyerDtoArray } from './buyer.dto';
import { OmitType } from '@nestjs/swagger';

export class SellerDto extends OmitType(BuyerDto, [] as const) {}

export const toSellerDto = toBuyerDto;

export const toSellerDtoArray = toBuyerDtoArray;
