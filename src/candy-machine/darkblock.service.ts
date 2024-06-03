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
      console.error('Error while minting a Darkblock: ', e);
      throw new InternalServerErrorException('Failed to mint a Darkblock', e);
    }
  }

  // TODO v2: Correctly Hash file with SHA256
  async addCollectionDarkblock(
    fileKey: string,
    fileHash: string,
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
        collection,
        nftPlatform,
        traits,
        fileHash,
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
      console.error('Failed to add a Darkblock for collection: ', e);
      throw new InternalServerErrorException(
        'Failed to add a Darkblock for collection',
        e,
      );
    }
  }

  async createCollectionSignature(
    collection: string,
    nftPlatform: string,
    traits: DarkblockTraits[],
    fileHash: string,
  ) {
    let formattedTraits: string = '';
    traits.forEach((trait, index) => {
      formattedTraits += trait.name + '=' + trait.value;
      if (index < traits.length - 1) {
        formattedTraits += ':';
      }
    });
    const encoder = new TextEncoder();
    const message =
      'You are interacting with the Darkblock Protocol.\n\nAttention: You are attempting to upgrade an entire NFT collection!\n\nPlease sign to continue.\n\nThis request will not trigger a blockchain transaction or cost any fee.\nAuthentication Token: ';
    const payload = encoder.encode(
      message.concat(nftPlatform, fileHash, collection, formattedTraits),
    );
    const signature = nacl.sign.detached(
      payload,
      this.metaplex.identity().secretKey,
    );
    return btoa(String.fromCharCode.apply(null, signature));
  }
}
