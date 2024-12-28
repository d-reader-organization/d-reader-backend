import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';
import { validatePassword } from '../utils/user';

export const IS_STRONG_PASSWORD = 'isStrongPassword';
export function isStrongPassword(value: string): boolean {
  return validatePassword(value);
}

export function IsStrongPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_STRONG_PASSWORD,
      validator: {
        validate: validatePassword,
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property is not strong enough',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
