import {
  ValidationOptions,
  isURL,
  ValidateBy,
  buildMessage,
} from 'class-validator';

export const IS_EMPTY_OR_URL = 'isEmptyOrUrl';

/**
 * Checks if string is empty and if not, checks if it's a URL.
 */
export function isEmptyOrUrl(value: unknown): boolean {
  return typeof value === 'string' && (value === '' || isURL(value));
}

/**
 * Checks if string is empty and if not, checks if it's a URL.
 */
export function IsEmptyOrUrl(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_EMPTY_OR_URL,
      validator: {
        validate: (value): boolean => isEmptyOrUrl(value),
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be a Solana address',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
