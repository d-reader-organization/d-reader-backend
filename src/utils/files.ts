import { MetaplexFile, toMetaplexFile } from '@metaplex-foundation/js';
import { getS3Object } from '../aws/s3client';
import { Readable } from 'stream';
import * as path from 'path';

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
