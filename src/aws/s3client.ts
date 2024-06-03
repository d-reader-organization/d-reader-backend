import {
  GetObjectCommand,
  GetObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../configs/config';
import { subHours } from 'date-fns';
import { TransformFnParams } from 'class-transformer';
import { isNil } from 'lodash';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const timekeeper = require('timekeeper');

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

// round the time to 12 hours ago
export const getTruncatedTime = () => {
  const now = new Date();
  const twelveHoursAgo = subHours(now, 12);

  twelveHoursAgo.setMinutes(0);
  twelveHoursAgo.setSeconds(0);
  twelveHoursAgo.setMilliseconds(0);

  return twelveHoursAgo;
};

export const s3Client = new S3Client({
  region: config().s3.region,
  credentials: config().s3.credentials,
});

export const getS3Object = async (
  getObjectInput: Optional<GetObjectCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new GetObjectCommand({ Bucket: config().s3.bucket, ...getObjectInput }),
  );
};

export const getPublicUrl = (key: string) => {
  // If key is an empty string, return it
  if (!key) return key;
  else if (key.startsWith('https://')) return key;
  else if (config().s3.cdn) return `${config().s3.cdn}/${key}`;
  else return `https://${config().s3.bucket}.s3.amazonaws.com/${key}`;
};

export const transformToUrl = (params: TransformFnParams) => {
  const key = params.value;
  if (isNil(key)) return '';
  if (key.startsWith('https://')) return key;
  else if (typeof key !== 'string') {
    throw new Error('S3 Key must be of type string');
  } else return getPublicUrl(key);
};

export const getPresignedUrl = async (key: string) => {
  // If key is an empty string, return it
  if (!key) return key;

  const getCommand = new GetObjectCommand({
    Bucket: config().s3.bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 86400, // 24 hours
  });

  return signedUrl;
};

/**
 * This is a cache-friendly variant of s3.getSignedUrl
 * Every 12 hours a new presigned URL will be generated,
 * in between the same URL will be reused
 * @deprecated
 */
export const getCachedReadUrl = async (key: string) => {
  // If key is an empty string, return it
  if (!key) return key;

  const getCommand = new GetObjectCommand({
    Bucket: config().s3.bucket,
    Key: key,
  });

  const signedUrl = await timekeeper.withFreeze(getTruncatedTime(), () => {
    return getSignedUrl(s3Client, getCommand, {
      expiresIn: 86400, // 24 hours
    });
  });

  return signedUrl;
};

export default s3Client;
