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
import { createHash } from 'crypto';

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
    const hash = createHash('sha256').update(file).digest('hex');
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
    return Buffer.from(signature).toString('base64');
  }
}
