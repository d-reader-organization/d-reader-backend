import { ValidationOptions, ValidateIf } from 'class-validator';

/**
 * Checks if value is missing or is an empty string and if so, ignores all validators.
 */
export function IsOptionalString(validationOptions?: ValidationOptions) {
  return ValidateIf((obj, value) => {
    return value !== null && value !== undefined && value !== '';
  }, validationOptions);
}
