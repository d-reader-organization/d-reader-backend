/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

export class RequestDataDto {
  fileField: string;
  bodyType: any;
  fileType: any;
}

export const ApiFileWithBody = createParamDecorator(
  async (data: RequestDataDto, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const files = request.files;
    const body = request.body;

    const bodyData = plainToInstance(data.bodyType, body);
    const fileData = plainToInstance(data.fileType, files[0]);
    return { [data.fileField]: fileData, ...bodyData };
  },
);
