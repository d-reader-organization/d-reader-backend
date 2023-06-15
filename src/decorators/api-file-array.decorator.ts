import {
  BadRequestException,
  ExecutionContext,
  createParamDecorator,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isArray } from 'lodash';
import { RequestDataDto } from './api-file-array.dto';
import { validate } from 'class-validator';

async function validateData(bodyData: object, fileData: object) {
  const errors = await Promise.all([validate(bodyData), validate(fileData)]);
  if (errors[0].length || errors[1].length) {
    throw new BadRequestException('Validation failed');
  }
}

export const ApiFileArray = createParamDecorator(
  async (data: RequestDataDto, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const files = request.files;
    if (!isArray(files)) throw new Error('Files should be an array');
    if (!request.body[data.bodyField])
      throw new Error(`field ${data.bodyField} does not exist`);

    const body = request.body[data.bodyField];
    const filesArray = await Promise.all(
      files.map(async (val, i) => {
        const bodyData = plainToInstance(data.bodyType, body[i]);
        const fileData = plainToInstance(data.fileType, val);
        await validateData(bodyData, fileData);
        const obj = { [data.fileField]: fileData, ...bodyData };
        return obj;
      }),
    );
    return filesArray;
  },
);
