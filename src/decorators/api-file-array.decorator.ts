/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ExecutionContext,
  createParamDecorator,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isArray } from 'lodash';
import { validate } from 'class-validator';

export class RequestDataDto {
  bodyField: string;
  fileField: string;
  bodyType: any;
  fileType: any;
}

async function validateData(bodyData: object, fileData: object) {
  const errors = await Promise.all([validate(bodyData), validate(fileData)]);
  if (errors[0].length || errors[1].length) {
    throw new BadRequestException('Validation failed');
  }
}

/** files and body array will be recieved independently, so make sure body matches the files on each indexed, for body without a file pass a 0 size file buffer and handle that in the service */
export const ApiFileArray = createParamDecorator(
  async (data: RequestDataDto, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const files = request.files;
    if (!isArray(files)) throw new Error('Files should be an array');
    if (!request.body[data.bodyField]) {
      throw new Error(`field ${data.bodyField} does not exist`);
    }

    const body: [] = request.body[data.bodyField];
    const dataArray = await Promise.all(
      body.map(async (content, i) => {
        const bodyData = plainToInstance(data.bodyType, content);
        const fileData = plainToInstance(data.fileType, files[i]);
        // await validateData(bodyData, fileData);
        return { [data.fileField]: fileData, ...bodyData };
      }),
    );
    return dataArray;
  },
);
