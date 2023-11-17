import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Metaplex } from '@metaplex-foundation/js';
import { DARKBLOCK_API } from '../constants';
import { metaplex } from '../utils/metaplex';
import { getS3Object } from '../aws/s3client';
import axios from 'axios';
import * as FormData from 'form-data';
import { DarkblockTraits } from './dto/types';
import * as nacl from 'tweetnacl';
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import * as CryptoJS from 'crypto-js';
import { s3Service } from '../aws/s3.service';

@Injectable()
export class DarkblockService {
  private readonly metaplex: Metaplex;

  constructor(private readonly s3: s3Service) {
    this.metaplex = metaplex;
  }

  async mintDarkblock(
    fileKey: string,
    description: string,
    creatorAddress: string,
  ): Promise<string> {
    try {
      if (!fileKey) throw new BadRequestException('Missing Darkblock file');

      const query = new URLSearchParams({
        apikey: process.env.DARKBLOCK_API_KEY,
      }).toString();

      const form = new FormData();
      const getFileFromS3 = await getS3Object({ Key: fileKey });
      const nftPlatform =
        process.env.SOLANA_CLUSTER === 'devnet' ? 'Solana-Devnet' : 'Solana';
      const data = {
        file: getFileFromS3.Body,
        creator_address: this.metaplex.identity().publicKey.toString(),
        nft_platform: nftPlatform,
        nft_standard: 'Metaplex',
        darkblock_description: description,
        publisher_address: creatorAddress,
      };
      Object.entries(data).forEach((entry) => {
        form.append(entry[0], entry[1]);
      });

      const response = await axios.post(
        `${DARKBLOCK_API}/darkblock/mint?${query}`,
        form,
      );

      return response.data.tx_id;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Failed to mint a Darkblock', e);
    }
  }

  // TODO: Fix darkblock 502 error response issue
  async addCollectionDarkblock(
    fileKey: string,
    description: string,
    collectionAddress:string,
    collection: string,
    traits: DarkblockTraits[],
  ) {
    try {
      if (!fileKey) throw new BadRequestException('Missing Darkblock file');

      const query = new URLSearchParams({
        apikey: process.env.DARKBLOCK_API_KEY,
      }).toString();

      const form = new FormData();
      const getFileFromS3 = await getS3Object({ Key: fileKey });
      const nftPlatform =
        process.env.SOLANA_CLUSTER === 'devnet' ? 'Solana-Devnet' : 'Solana';
      const darkblock_signature = await this.createCollectionSignature(
        getFileFromS3,
        collection,
        nftPlatform,
        traits,
      );
      const data = {
        file: getFileFromS3.Body,
        creator_address: this.metaplex.identity().publicKey.toString(),
        nft_platform: nftPlatform,
        nft_standard: 'Metaplex',
        traits: JSON.stringify(traits),
        collection,
        darkblock_signature,
        darkblock_description: description,
      };
      Object.entries(data).forEach((entry) => {
        form.append(entry[0], entry[1]);
      });
      console.log(data);
      const response = await axios.post(
        `${DARKBLOCK_API}/darkblock/upgrade/collection?${query}`,
        form,
      );
      return response.data.tx_id;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(
        'Failed to add a Darkblock for collection',
        e,
      );
    }
  }

  async createCollectionSignature(
    getFileFromS3: GetObjectCommandOutput,
    collection: string,
    nftPlatform: string,
    traits: DarkblockTraits[],
  ) {
    const file = await getFileFromS3.Body.transformToByteArray();
    const wordArray = this.uint8ArrayToWordArray(file);
    const hash = CryptoJS.SHA256(wordArray).toString();
    console.log(hash);
    let formattedTraits: string = '';
    traits.forEach((trait, index) => {
      formattedTraits += trait.name + '=' + trait.value;
      if (index < traits.length - 1) {
        formattedTraits += ':';
      }
    });
    const encoder = new TextEncoder();
    const payload = encoder.encode(
      nftPlatform.concat(hash, collection, formattedTraits),
    );
    const signature = nacl.sign.detached(
      payload,
      this.metaplex.identity().secretKey,
    );
    return btoa(
      String.fromCharCode.apply(null,signature)
    );
  }

  async getSHA256OfFileChunks(fileKey: string): Promise<string> {
    let SHA256 = CryptoJS.algo.SHA256.create();
    let counter = 0;

    return new Promise(async(resolve, reject) => {
      try {
        // Fetch file from S3
        const getFileFromS3 = (await (this.s3.getObject({ Key: fileKey }))).Body.transformToWebStream();

        // Closure to capture the file information
        const callbackProgress = (data: Buffer) => {
          let wordBuffer = this.uint8ArrayToWordArray(data);
          SHA256.update(wordBuffer);
          counter += data.length;
        };

        const callbackFinal = () => {
          let encrypted = SHA256.finalize().toString();
          resolve(encrypted);
        };

        // Attach event handlers to the stream
        getFileFromS3
        // @ts-ignore
          .on('data', callbackProgress)
          .on('end', callbackFinal)
          .on('error', (error) => {
            reject(error);
          });
      } catch (e) {
        reject(e);
      }
    });
  }

 uint8ArrayToWordArray(uint8Array: Uint8Array) {
  const words = [];
  for (let i = 0; i < uint8Array.length; i += 4) {
    let word = 0;
    for (let j = 0; j < 4; j++) {
      word += uint8Array[i + j] << (8 * (3 - j));
    }
    words.push(word >>> 0); // Ensure it's an unsigned 32-bit integer
  }
  return CryptoJS.lib.WordArray.create(words, uint8Array.length);
}
}
