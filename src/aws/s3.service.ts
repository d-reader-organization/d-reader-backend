import {
  PutObjectCommandInput,
  PutObjectCommand,
  GetObjectCommandInput,
  GetObjectCommand,
  CopyObjectCommandInput,
  CopyObjectCommand,
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
import { Optional, appendTimestamp } from '../utils/helpers';
import * as path from 'path';
import { isEmpty } from 'lodash';
import { getTruncatedTime } from './s3client';
import { v4 as uuidv4 } from 'uuid';

export type UploadFileOptions = {
  s3Folder: string;
  fileName?: string;
  timestamp?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const timekeeper = require('timekeeper');

export type s3File = {
  fieldname: Express.Multer.File['fieldname'];
  originalname: Express.Multer.File['originalname'];
  mimetype: Express.Multer.File['mimetype'];
  buffer: Express.Multer.File['buffer'];
};

@Injectable()
export class s3Service {
  readonly region: string;
  readonly bucket: string;
  readonly cdn: string;
  readonly client: S3Client;

  constructor() {
    this.region = config().s3.region;
    this.bucket = config().s3.bucket;
    this.cdn = config().s3.cdn;

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

  getPublicUrl = (key: string) => {
    // If key is an empty string, return it
    if (!key) return key;
    else if (key.startsWith('https://')) return key;
    else if (this.cdn) return `${config().s3.cdn}/${key}`;
    else `https://${this.bucket}.s3.amazonaws.com/${key}`;
  };

  getPresignedUrl = async (
    key: string,
    options?: Optional<GetObjectCommandInput, 'Bucket' | 'Key'>,
  ) => {
    // If key is an empty string, return it
    if (!key) return key;

    const getCommand = new GetObjectCommand({
      ...options,
      Bucket: this.bucket,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.client, getCommand, {
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

  deleteObject = async (key: string) => {
    return await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  };

  /** Clean up new files when updating existing ones, in case there was an old file and it was overwriten by any new file */
  garbageCollectNewFiles = async (
    newFileKeys: string[],
    oldFileKeys: string[] = [],
  ) => {
    for (const newFileKey of newFileKeys) {
      if (!!newFileKey && !oldFileKeys.includes(newFileKey)) {
        await this.deleteObject(newFileKey);
      }
    }
  };

  /** Clean up new file when updating an existing one, in case there was an old file and it was overwriten by the new file */
  garbageCollectNewFile = async (newFileKey: string, oldFileKey?: string) => {
    if (oldFileKey !== newFileKey) {
      await this.deleteObject(newFileKey);
    }
  };

  /** Clean up old file when uploading a new one, in case there was an old file and it wasn't overwriten by the new file */
  garbageCollectOldFile = async (newFileKey: string, oldFileKey?: string) => {
    if (oldFileKey && oldFileKey !== newFileKey) {
      await this.deleteObject(oldFileKey);
    }
  };

  /** Clean up old files when uploading new ones, in case there was an old file and it wasn't overwriten by the new file */
  garbageCollectOldFiles = async (
    newFileKeys: string[],
    oldFileKeys: string[] = [],
  ) => {
    for (const oldFileKey of oldFileKeys) {
      if (!!oldFileKey && !newFileKeys.includes(oldFileKey)) {
        await this.deleteObject(oldFileKey);
      }
    }
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

  deleteFolder = async (prefix: string) => {
    const keys = await this.listFolderKeys({ Prefix: prefix });
    await this.deleteObjects(keys);
  };

  uploadFile = async (file: s3File, options: UploadFileOptions) => {
    if (file) {
      const s3Folder = options.s3Folder;
      const fileName = options.fileName || uuidv4();
      const timestamp = options.timestamp ?? true;
      const finalFileName = timestamp ? appendTimestamp(fileName) : fileName;
      const fileKey =
        s3Folder + finalFileName + path.extname(file.originalname);

      await this.putObject({
        ContentType: file.mimetype,
        Key: fileKey,
        Body: file.buffer,
      });

      return fileKey;
    } else throw new BadRequestException('No file provided');
  };

  /** Create download links for array of s3 keys */
  async getAttachments(keys: string[]) {
    const attachments = await Promise.all(
      keys.map((key) =>
        this.getPresignedUrl(key, {
          ResponseContentDisposition: 'attachment',
        }),
      ),
    );

    return attachments;
  }
}
