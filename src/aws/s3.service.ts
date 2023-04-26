import {
  PutObjectCommandInput,
  PutObjectCommand,
  GetObjectCommandInput,
  GetObjectCommand,
  CopyObjectCommandInput,
  CopyObjectCommand,
  DeleteObjectCommandInput,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2CommandInput,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, BadRequestException } from '@nestjs/common';
import config from '../configs/config';
import { Optional } from '../utils/helpers';
import * as path from 'path';
import { isEmpty } from 'lodash';
import { getTruncatedTime } from './s3client';
import timekeeper from 'timekeeper';

type s3File = {
  fieldname: Express.Multer.File['fieldname'];
  originalname: Express.Multer.File['originalname'];
  mimetype: Express.Multer.File['mimetype'];
  buffer: Express.Multer.File['buffer'];
};

@Injectable()
export class s3Service {
  readonly region: string;
  readonly bucket: string;
  readonly metadataBucket: string;
  readonly client: S3Client;

  constructor() {
    this.region = config().s3.region;
    this.bucket = config().s3.bucket;
    this.metadataBucket = config().s3.metadataBucket;

    this.client = new S3Client({
      region: this.region,
      credentials: config().s3.credentials,
    });
  }

  putObject = async (
    putObjectInput: Optional<PutObjectCommandInput, 'Bucket'>,
  ) => {
    return await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, ...putObjectInput }),
    );
  };

  getObject = async (
    getObjectInput: Optional<GetObjectCommandInput, 'Bucket'>,
  ) => {
    return await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, ...getObjectInput }),
    );
  };

  copyObject = async (
    copyObjectInput: Optional<CopyObjectCommandInput, 'Bucket'>,
  ) => {
    return await this.client.send(
      new CopyObjectCommand({ Bucket: this.bucket, ...copyObjectInput }),
    );
  };

  getReadUrl = async (key: string) => {
    // If key is an empty string, return it
    if (!key) return key;

    const getCommand = new GetObjectCommand({ Bucket: this.bucket, Key: key });

    const signedUrl = await getSignedUrl(this.client, getCommand, {
      expiresIn: 86400, // 24 hours
    });

    return signedUrl;
  };

  /**
   * This is a cache-friendly variant of s3.getSignedUrl
   * Every 12 hours a new presigned URL will be generated,
   * in between the same URL will be reused
   */
  getCachedReadUrl = async (key: string) => {
    // If key is an empty string, return it
    if (!key) return key;

    const getCommand = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const signedUrl = await timekeeper.withFreeze(getTruncatedTime(), () => {
      return getSignedUrl(this.client, getCommand, {
        expiresIn: 86400, // 24 hours
      });
    });

    return signedUrl;
  };

  deleteObject = async (
    deleteObjectInput: Optional<DeleteObjectCommandInput, 'Bucket'>,
  ) => {
    return await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, ...deleteObjectInput }),
    );
  };

  deleteObjects = async (keys: string[]) => {
    if (isEmpty(keys)) return;

    return await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  };

  uploadObject = async (
    putObjectInput: Optional<PutObjectCommandInput, 'Bucket'>,
  ) => {
    try {
      const multipartUpload = new Upload({
        client: this.client,
        params: { Bucket: this.bucket, ...putObjectInput },
      });

      return await multipartUpload.done();
    } catch (err) {
      console.error(err);
    }
  };

  listFolderKeys = async (
    listObjectsInput: Optional<
      ListObjectsV2CommandInput,
      'Bucket' | 'MaxKeys' | 'ContinuationToken'
    >,
  ) => {
    const crawlFolderKeys = async (
      ContinuationToken?: string,
      keys: string[] = [],
    ): Promise<string[]> => {
      const listObjects = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1000,
        ContinuationToken,
        ...listObjectsInput,
      });

      const response = await this.client.send(listObjects);
      const { Contents, NextContinuationToken } = response;

      if (!Contents || Contents.length === 0) return keys;

      const crawledKeys = Contents.reduce<string[]>((acc, object) => {
        if (object.Key) return [...acc, object.Key];
        else return acc;
      }, []);
      const accumulatedKeys = keys.concat(crawledKeys);

      if (response.IsTruncated) {
        return await crawlFolderKeys(NextContinuationToken, accumulatedKeys);
      } else return accumulatedKeys;
    };

    return await crawlFolderKeys();
  };

  uploadFile = async (prefix: string, file: s3File, name?: string) => {
    if (file) {
      const fileKey =
        prefix + (name ?? file.fieldname) + path.extname(file.originalname);

      await this.putObject({
        ContentType: file.mimetype,
        Key: fileKey,
        Body: file.buffer,
      });

      return fileKey;
    } else throw new BadRequestException('No file provided');
  };
}
