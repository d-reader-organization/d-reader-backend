import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  DeleteObjectsCommand,
  DeleteObjectsCommandInput,
  GetObjectCommand,
  GetObjectCommandInput,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException } from '@nestjs/common';
import config from '../configs/config';
import * as path from 'path';

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export const REGION = config().s3.region || 'us-east-1';
export const Bucket = process.env.AWS_BUCKET_NAME;
export const SeedBucket = process.env.AWS_BUCKET_NAME + '-seed';

export const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const putS3Object = async (
  putObjectInput: Optional<PutObjectCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new PutObjectCommand({ Bucket, ...putObjectInput }),
  );
};

export const getS3Object = async (
  getObjectInput: Optional<GetObjectCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new GetObjectCommand({ Bucket, ...getObjectInput }),
  );
};

export const copyS3Object = async (
  copyObjectInput: Optional<CopyObjectCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new CopyObjectCommand({ Bucket, ...copyObjectInput }),
  );
};

export const getReadUrl = async (key: string) => {
  // If key is an empty string, return it
  if (!key) return key;

  const getCommand = new GetObjectCommand({ Bucket, Key: key });

  const signedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 3600,
  });

  return signedUrl;
};

export const deleteS3Object = async (
  deleteObjectInput: Optional<DeleteObjectCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new DeleteObjectCommand({ Bucket, ...deleteObjectInput }),
  );
};

export const deleteS3Objects = async (
  deleteObjectsInput: Optional<DeleteObjectsCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new DeleteObjectsCommand({ Bucket, ...deleteObjectsInput }),
  );
};

export const uploadS3Object = async (
  putObjectInput: Optional<PutObjectCommandInput, 'Bucket'>,
) => {
  try {
    const multipartUpload = new Upload({
      client: s3Client,
      params: { Bucket, ...putObjectInput },
    });

    return await multipartUpload.done();
  } catch (err) {
    console.error(err);
  }
};

export const listS3FolderKeys = async (
  listObjectsInput: Optional<
    ListObjectsV2CommandInput,
    'Bucket' | 'MaxKeys' | 'ContinuationToken'
  >,
) => {
  const crawlS3FolderKeys = async (
    ContinuationToken?: string,
    keys: string[] = [],
  ): Promise<string[]> => {
    const listObjects = new ListObjectsV2Command({
      Bucket,
      MaxKeys: 1000,
      ContinuationToken,
      ...listObjectsInput,
    });

    const response = await s3Client.send(listObjects);
    const { Contents, NextContinuationToken } = response;

    if (!Contents || Contents.length === 0) return keys;

    const crawledKeys = Contents.reduce<string[]>((acc, object) => {
      if (object.Key) return [...acc, object.Key];
      else return acc;
    }, []);
    const accumulatedKeys = keys.concat(crawledKeys);

    if (response.IsTruncated) {
      return await crawlS3FolderKeys(NextContinuationToken, accumulatedKeys);
    } else return accumulatedKeys;
  };

  return await crawlS3FolderKeys();
};

export const uploadFile = async (
  prefix: string,
  file: Express.Multer.File,
  name?: string,
) => {
  if (file) {
    const fileKey =
      prefix + (name ?? file.fieldname) + path.extname(file.originalname);

    await putS3Object({
      ContentType: file.mimetype,
      Key: fileKey,
      Body: file.buffer,
    });

    return fileKey;
  } else throw new BadRequestException('No file provided');
};

export default s3Client;
