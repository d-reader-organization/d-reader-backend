import { GlobalStatusType, GlobalStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

export class GlobalStatusDto {
  type: GlobalStatusType;
  message: string;
}

export const toGlobalStatus = (status: GlobalStatus): GlobalStatusDto => {
  const globalStatusDto = {
    type: status.type,
    message: status.message,
  };
  return plainToInstance(GlobalStatusDto, globalStatusDto);
};

export const toGlobalStatusArray = (statusArray: GlobalStatus[]) => {
  return statusArray.map(toGlobalStatus);
};
