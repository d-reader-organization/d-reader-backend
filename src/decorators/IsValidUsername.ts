import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';
import { validateName } from '../utils/user';

export const IS_VALID_USERNAME = 'isValidUsername';
export function isValidUsername(value: string): boolean {
  return validateName(value);
}

export function IsValidUsername(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_VALID_USERNAME,
      validator: {
        validate: validateName,
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property is not valid format',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
