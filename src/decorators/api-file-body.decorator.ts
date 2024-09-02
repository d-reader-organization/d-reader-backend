/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

export class RequestDataDto {
  fileFields: string[];
  bodyType: any;
  fileType: any;
}

export const ApiFilesWithBody = createParamDecorator(
  async (data: RequestDataDto, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const files = request.files;
    const body = request.body;

    const bodyData = plainToInstance(data.bodyType, body);
    const fileDataArray = data.fileFields.map((field, i) => {
      return [field, files[i]];
    });
    const fileDataObject = Object.fromEntries(fileDataArray);

    return { ...fileDataObject, ...bodyData };
  },
);
