import { User, UserInterestedReceipt } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';

export class UserInterestedReceiptDto {
  @IsNumber()
  id: number;

  @IsString()
  projectSlug: string;

  @IsDate()
  timestamp: Date;

  @IsString()
  username: string;

  @IsNumber()
  expressedAmount: number;
}

export type UserInterestedReceiptInput = UserInterestedReceipt & { user: User };

export function toUserInterestedReceiptDto(
  receipt: UserInterestedReceiptInput,
) {
  const user = receipt.user;
  const plainUserInterestedReceiptDto: UserInterestedReceiptDto = {
    id: receipt.id,
    projectSlug: receipt.projectSlug,
    timestamp: receipt.timestamp,
    username: user.username,
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
