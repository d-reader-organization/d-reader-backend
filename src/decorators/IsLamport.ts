import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';

export const IS_LAMPORT = 'isLamport';

// Address the upper boundary limitation: https://solana.stackexchange.com/questions/3660/can-we-safely-represent-lamport-amounts-in-javascript-using-a-number

/**
 * Check if the number value is a valid lamport unit
 */
export function isLamport(value: unknown): boolean {
  try {
    return typeof value === 'number' && value >= 0 && value % 1 === 0;
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
