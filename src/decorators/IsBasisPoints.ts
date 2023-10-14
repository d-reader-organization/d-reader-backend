import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';

export const IS_BASIS_POINTS = 'isBasisPoints';

/**
 * Check if the number value is a valid basis points unit
 */
export function isBasisPoints(value: unknown): boolean {
  try {
    return (
      typeof value === 'number' &&
      value >= 0 &&
      value <= 10000 &&
      value % 1 === 0
    );
  } catch {
    return false;
  }
}

/**
 * Check if the number value is a valid basis points unit
 */
export function IsBasisPoints(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_BASIS_POINTS,
      validator: {
        validate: (value): boolean => isBasisPoints(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            eachPrefix + '$property is not a valid basis points value',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
