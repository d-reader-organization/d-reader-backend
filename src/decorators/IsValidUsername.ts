import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';
import { validateUserName } from '../utils/user';

export const IS_VALID_USERNAME = 'isValidUsername';
export function isValidUsername(value: string): boolean {
  return validateUserName(value);
}

export function IsValidUsername(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_VALID_USERNAME,
      validator: {
        validate: validateUserName,
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property is not valid format',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
