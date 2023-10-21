import { BadRequestException } from '@nestjs/common';
import { Transform, TransformOptions } from 'class-transformer';

export function TransformStringToNumber(options?: TransformOptions) {
  return Transform(
    ({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value),
    options,
  );
}

export function TransformStringToBoolean(options?: TransformOptions) {
  return Transform(({ value, key }) => {
    if (typeof value === 'string') {
      if (value !== 'true' && value !== 'false') {
        throw new BadRequestException(
          key + ' must be a boolean or a boolean string',
        );
      } else return value === 'true';
    } else return value;
  }, options);
}

export function TransformToFile(options?: TransformOptions) {
  return Transform(({ value }) => value[0], options);
}

export function TransformCsvToArray(options?: TransformOptions) {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    } else return value;
  }, options);
}

export function TransformDateStringToIsoString(options?: TransformOptions) {
  return Transform(({ value }) => new Date(value).toISOString(), options);
}

export function TransformDateStringToDate(options?: TransformOptions) {
  return Transform(({ value }) => new Date(value), options);
}
