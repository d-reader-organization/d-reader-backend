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
}
