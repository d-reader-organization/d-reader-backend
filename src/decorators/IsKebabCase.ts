import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';
import { kebabCase, isEmpty } from 'lodash';

export const IS_KEBAB_CASE = 'isKebabCase';

/**
 * Check if the string is in kebab-case format
 */
export function isKebabCase(value: unknown): boolean {
  try {
    if (typeof value === 'string' && !isEmpty(value)) {
      const kebabCaseValue = kebabCase(value);
      return value === kebabCaseValue;
    } else return false;
  } catch {
    return false;
  }
}

/**
 * Check if the string is in kebab-case format
 */
export function IsKebabCase(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_KEBAB_CASE,
      validator: {
        validate: (value): boolean => isKebabCase(value),
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be in kebab-case format',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
