import {
  ValidationOptions,
  buildMessage,
  ValidateBy,
  isInt,
  min,
  max,
} from 'class-validator';

export const IS_INT_RANGE = 'isIntRange';

/**
 * Check if the number value is an integer between the min and max range
 */
export function isIntRange(
  value: unknown,
  minValue: number,
  maxValue: number,
): boolean {
  try {
    return isInt(value) && min(value, minValue) && max(value, maxValue);
  } catch {
    return false;
  }
}

/**
 * Check if the number value is an integer between the min and max range
 */
export function IsIntRange(
  min: number,
  max: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_INT_RANGE,
      validator: {
        validate: (value): boolean => isIntRange(value, min, max),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            eachPrefix + '$property is not a valid integer within in a range',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
