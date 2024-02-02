import { ValidationOptions, buildMessage, ValidateBy } from 'class-validator';

const notificationDataKeys = [
  'comicIssueId',
  'comicSlug',
  'creatorSlug',
  'nftAddress',
  'externalUrl',
];

export const IS_NOTIFICATION_DATA = 'isNotificationData';
export function isValidNotificationData(
  input: Record<string, string>,
): boolean {
  const key = Object.keys(input).at(0);
  return notificationDataKeys.includes(key);
}

export function IsNotificationData(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_NOTIFICATION_DATA,
      validator: {
        validate: (value): boolean => isValidNotificationData(value),
        defaultMessage: buildMessage(
          () =>
            `Data key should be one of the following: ${notificationDataKeys.join(
              ', ',
            )}`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
