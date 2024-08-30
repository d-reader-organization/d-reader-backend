import { APIEmbedField, bold, strikethrough } from 'discord.js';

const keysToIgnore = ['createdAt', 'updatedAt'];

const fieldData = <T>({
  oldData,
  updatedData,
}: {
  oldData: T;
  updatedData: T;
}): APIEmbedField[] => {
  const keys = Object.keys(updatedData);
  return keys.reduce<APIEmbedField[]>((prev, curr) => {
    const oldValue = oldData[curr];
    const newValue = updatedData[curr];
    if (typeof newValue === 'object' || typeof newValue === 'undefined') {
      return prev;
    }

    if (oldValue === newValue || keysToIgnore.includes(curr)) {
      return prev;
    }
    return [
      ...prev,
      {
        name: `${curr.toUpperCase()}`,
        value: `${strikethrough(oldValue.toString())} -> ${bold(
          newValue.toString(),
        )}`,
        inline: false,
      },
    ];
  }, []);
};

export const embedsForUpdateNotification = <T>({
  title,
  oldData,
  updatedData,
}: {
  title: string;
  oldData: T;
  updatedData: T;
}) => ({
  title: title,
  color: 0x4caf50,
  fields: fieldData<T>({
    oldData,
    updatedData,
  }),
});
