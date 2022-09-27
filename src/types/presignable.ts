import { getReadUrl } from 'src/aws/s3client';

type StringValKeys<T> = keyof {
  [P in keyof T as T[P] extends string ? P : never]: P;
} &
  keyof T;

export class Presignable<T extends Record<PropertyKey, any>> {
  protected async presignProperty(
    object: T,
    key: StringValKeys<T>,
  ): Promise<string> {
    if (typeof object[key] === 'string') {
      object[key] = (await getReadUrl(object[key])) as T[StringValKeys<T>];
      return object[key];
    } else throw new Error('Forbidden property to presign at runtime');
  }

  protected async presign(
    object: T,
    properties: Array<StringValKeys<T>>,
  ): Promise<T> {
    // Parallel
    await Promise.all(
      properties.map(async (property) => {
        await this.presignProperty(object, property);
      }),
    );

    return object;
  }
}
