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
import { SHA256, enc } from 'crypto-js';
import { DarkblockTraits } from './dto/types';
@Injectable()
export class DarkblockService {
  private readonly metaplex: Metaplex;

  constructor() {
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

  async addCollectionDarkblock(
    fileKey: string,
    description: string,
    collectionName: string,
    collectionAddress: string,
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
      const fileString = enc.Base64.parse(
        await getFileFromS3.Body.transformToString(),
      );
      const sha256 = SHA256(fileString).toString();
      let formattedTraits: string = '';
      traits.forEach((trait, index) => {
        formattedTraits += trait.name + '=' + trait.value;
        if (index < traits.length - 1) {
          formattedTraits += ':';
        }
      });
      console.log('formatted traits', formattedTraits);
      const encoder = new TextEncoder();
      const payload = encoder.encode(
        `${nftPlatform}${sha256}${collectionName}${formattedTraits}`,
      );
      const uint8ArraytoHex = (array: Uint8Array) =>
        Buffer.from(array).toString('hex');
      console.log(`${nftPlatform}${sha256}${collectionName}${formattedTraits}`);
      const ed25519 = await import('@noble/ed25519');
      const signature = ed25519.sign(
        uint8ArraytoHex(payload),
        uint8ArraytoHex(this.metaplex.identity().secretKey).slice(0, 32),
      );
      console.log(signature);
      const data = {
        file: getFileFromS3.Body,
        creator_address: this.metaplex.identity().publicKey.toString(),
        nft_platform: nftPlatform,
        nft_standard: 'Metaplex',
        traits: JSON.stringify(traits),
        collection: collectionAddress,
        darkblock_signature: signature,
        darkblock_description: description,
      };
      console.log('data', data);
      Object.entries(data).forEach((entry) => {
        form.append(entry[0], entry[1]);
      });

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
}
