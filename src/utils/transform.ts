import { Transform, TransformOptions } from 'class-transformer';

export function TransformStringToNumber(options?: TransformOptions) {
  return Transform(
    ({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value),
    options,
  );
}

export function TransformStringToBoolean(options?: TransformOptions) {
  return Transform(
    ({ value }) => (typeof value === 'string' ? Boolean(value) : value),
    options,
  );
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
