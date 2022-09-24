import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';
import { snakeCase, isEmpty } from 'lodash';

export const IS_SNAKE_CASE = 'isSnakeCase';

/**
 * Check if the string is in snake_case format
 */
export function isSnakeCase(value: unknown): boolean {
  try {
    if (typeof value === 'string' && !isEmpty(value)) {
      const snakeCaseValue = snakeCase(value);
      return value === snakeCaseValue;
    } else return false;
  } catch {
    return false;
  }
}

/**
 * Check if the string is in snake_case format
 */
export function IsSnakeCase(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_SNAKE_CASE,
      validator: {
        validate: (value): boolean => isSnakeCase(value),
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be in snake_case format',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
