import {
  ValidationOptions,
  isURL,
  ValidateBy,
  buildMessage,
} from 'class-validator';

export const IS_OPTIONAL_URL = 'isOptionalUrl';

/**
 * Checks if value is missing and if not, checks if the non-empty string is a URL.
 */
export function isOptionalUrl(value: unknown): boolean {
  return typeof value === 'string'
    ? value === '' || isURL(value)
    : value === undefined || value === null;
}

/**
 * Checks if value is missing and if not, checks if the non-empty string is a URL.
 */
export function IsOptionalUrl(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_OPTIONAL_URL,
      validator: {
        validate: (value): boolean => isOptionalUrl(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            eachPrefix + '$property must be an empty value or an URL address',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
