import { MetaplexFile, toMetaplexFile } from '@metaplex-foundation/js';
import { getS3Object } from '../aws/s3client';
import { Readable } from 'stream';
import * as path from 'path';
import axios from 'axios';
import { s3File } from 'src/aws/s3.service';

export const streamToString = (stream: Readable) => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('error', reject);
  });
};

/** Fetch a file from S3 bucket and convert it to a MetaplexFile type */
export const s3toMxFile = async (
  key: string,
  fileName?: string,
): Promise<MetaplexFile> => {
  const getFileFromS3 = await getS3Object({ Key: key });
  const file = await streamToString(getFileFromS3.Body as Readable);

  const defaultFileName = path.basename(key);
  const customFileName = fileName ? fileName + path.extname(key) : undefined;
  const mxFileName = customFileName || defaultFileName;
  return toMetaplexFile(file, mxFileName);
};

/** Fetch a image from url and convert it to a s3 type */
export const imageUrlToS3File = async (url: string): Promise<s3File> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');

  const file: s3File = {
    fieldname: 'png',
    originalname: 'image.png',
    mimetype: 'image/png',
    buffer,
  };
  return file;
};
