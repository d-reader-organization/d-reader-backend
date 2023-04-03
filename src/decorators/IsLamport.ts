import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';

export const IS_LAMPORT = 'isLamport';

/**
 * Check if the number value is a valid lamport unit
 */
export function isLamport(value: unknown): boolean {
  try {
    return typeof value === 'number' && value >= 0;
  } catch {
    return false;
  }
}

/**
 * Check if the number value is a valid lamport unit
 */
export function IsLamport(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_LAMPORT,
      validator: {
        validate: (value): boolean => isLamport(value),
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property is not a valid lamport value',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
