import { ApiBody } from '@nestjs/swagger';

export const ApiFile =
  (fieldname: string = 'file'): MethodDecorator =>
  (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          [fieldname]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    })(target, propertyKey, descriptor);
  };
