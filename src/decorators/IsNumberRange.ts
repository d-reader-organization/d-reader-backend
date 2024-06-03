import {
  ValidationOptions,
  buildMessage,
  ValidateBy,
  isNumber,
  min,
  max,
} from 'class-validator';

export const IS_NUMBER_RANGE = 'isNumberRange';

/**
 * Check if the number value is a number between the min and max range
 */
export function isNumberRange(
  value: unknown,
  minValue: number,
  maxValue: number,
): boolean {
  try {
    return isNumber(value) && min(value, minValue) && max(value, maxValue);
  } catch {
    return false;
  }
}

/**
 * Check if the number value is a number between the min and max range
 */
export function IsNumberRange(
  min: number,
  max: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_NUMBER_RANGE,
      validator: {
        validate: (value): boolean => isNumberRange(value, min, max),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            eachPrefix + '$property is not a valid number within in a range',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
