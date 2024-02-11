import { PublicKey } from '@solana/web3.js';
import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';

export const IS_SOLANA_ADDRESS = 'isSolanaAddress';

/**
 * Check if the string is a Solana address using PublicKey.isOnCurve method. Does not validate address checksums.
 * If given value is not a string, then it returns false.
 */
export function isSolanaAddress(value: unknown): boolean {
  try {
    return typeof value === 'string' && PublicKey.isOnCurve(value);
  } catch {
    return false;
  }
}

/**
 * Check if the string is a Solana address using PublicKey.isOnCurve method. Does not validate address checksums.
 * If given value is not a string, then it returns false.
 */
export function IsSolanaAddress(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_SOLANA_ADDRESS,
      validator: {
        validate: (value): boolean => isSolanaAddress(value),
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be a Solana address',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}

/**
 * Check if each string in array is a solana address.
 */
export function ArraySolanaAddress(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'ArraySolanaAddress',
      validator: {
        validate: (value): boolean => {
          if (!Array.isArray(value)) return false;
          return value.every((item) => isSolanaAddress(item));
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be a Solana address',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
