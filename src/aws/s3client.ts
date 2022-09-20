import {
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
import config from '../configs/config';

// TODO v2: refator this to s3.service.ts ?
const REGION = config().s3.region || 'us-east-1';

const s3Client = new S3Client({ region: REGION });

const putS3Object = async (
  putObjectInput: Omit<PutObjectCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new PutObjectCommand({
      Bucket: config().s3.bucket,
      ...putObjectInput,
    }),
  );
};

const getS3Object = async (
  getObjectInput: Omit<GetObjectCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new GetObjectCommand({
      Bucket: config().s3.bucket,
      ...getObjectInput,
    }),
  );
};

const deleteS3Object = async (
  deleteObjectInput: Omit<DeleteObjectCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config().s3.bucket,
      ...deleteObjectInput,
    }),
  );
};

const deleteS3Objects = async (
  deleteObjectsInput: Omit<DeleteObjectsCommandInput, 'Bucket'>,
) => {
  return await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: config().s3.bucket,
      ...deleteObjectsInput,
    }),
  );
};

const uploadS3Object = async (
  putObjectInput: Omit<PutObjectCommandInput, 'Bucket'>,
) => {
  try {
    const multipartUpload = new Upload({
      client: s3Client,
      params: {
        Bucket: config().s3.bucket,
        ...putObjectInput,
      },
    });

    return await multipartUpload.done();
  } catch (err) {
    console.error(err);
  }
};

const listS3FolderKeys = async (
  listObjectsInput: Omit<
    ListObjectsV2CommandInput,
    'Bucket' | 'MaxKeys' | 'ContinuationToken'
  >,
) => {
  const crawlS3FolderKeys = async (
    ContinuationToken?: string,
    keys: string[] = [],
  ): Promise<string[]> => {
    const listObjects = new ListObjectsV2Command({
      Bucket: config().s3.bucket,
      MaxKeys: 1000,
      ContinuationToken,
      ...listObjectsInput,
    });

    const response = await s3Client.send(listObjects);
    const { Contents, NextContinuationToken } = response;

    if (!Contents || Contents.length === 0) return keys;

    const crawledKeys = Contents.map((object) => object.Key);
    const accumulatedKeys = keys.concat(crawledKeys);

    if (response.IsTruncated) {
      return await crawlS3FolderKeys(NextContinuationToken, accumulatedKeys);
    } else return accumulatedKeys;
  };

  return await crawlS3FolderKeys();
};

export {
  s3Client,
  putS3Object,
  uploadS3Object,
  getS3Object,
  deleteS3Object,
  deleteS3Objects,
  listS3FolderKeys,
};
