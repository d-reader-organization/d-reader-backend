import { User, UserInterestedReceipt } from '@prisma/client';
import { plainToInstance, Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';
import { BasicUserDto, toBasicUserDto } from 'src/user/dto/basic-user-dto';

export class UserInterestedReceiptDto {
  @IsNumber()
  id: number;

  @IsString()
  projectSlug: string;

  @IsDate()
  timestamp: Date;

  @Type(() => BasicUserDto)
  user: BasicUserDto;

  @IsNumber()
  expressedAmount: number;
}

export type UserInterestedReceiptInput = UserInterestedReceipt & { user: User };

export function toUserInterestedReceiptDto(
  receipt: UserInterestedReceiptInput,
) {
  const plainUserInterestedReceiptDto: UserInterestedReceiptDto = {
    id: receipt.id,
    projectSlug: receipt.projectSlug,
    timestamp: receipt.timestamp,
    user: toBasicUserDto(receipt.user),
    expressedAmount: receipt.expressedAmount,
  };

  return plainToInstance(
    UserInterestedReceiptDto,
    plainUserInterestedReceiptDto,
  );
}

export function toUserInterestedReceiptDtoArray(
  receipts: UserInterestedReceiptInput[],
) {
  return receipts.map(toUserInterestedReceiptDto);
}
