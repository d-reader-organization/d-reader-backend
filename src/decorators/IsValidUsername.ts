import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';
import { USERNAME_VALIDATOR_REGEX } from '../constants';

export const IS_VALID_USERNAME = 'isValidUsername';
export function isValidUsername(value: string): boolean {
  return USERNAME_VALIDATOR_REGEX.test(value);
}

export function IsValidUsername(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_VALID_USERNAME,
      validator: {
        validate: (value): boolean => isValidUsername(value),
        defaultMessage: buildMessage(
          () => 'Username can only have A-Z, 0-9, - characters',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
