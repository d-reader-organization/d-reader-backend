import { toMetaplexFile } from '@metaplex-foundation/js';
import { getS3Object } from 'src/aws/s3client';
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

export const s3toMxFile = async (key: string, fileName: string) => {
  const getFileFromS3 = await getS3Object({ Key: key });
  const file = await streamToString(getFileFromS3.Body as Readable);
  const coverImageFileName = fileName + path.extname(key);
  return toMetaplexFile(file, coverImageFileName);
};
