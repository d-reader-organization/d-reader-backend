import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { DAS } from 'helius-sdk';
import { fetchOffChainMetadata, findRarityTrait } from './nft-metadata';
import { AUTH_TAG, pda } from '../candy-machine/instructions/pda';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';
import { clusterHeliusApiUrl } from './helius';
import { TENSOR_MAINNET_API_ENDPOINT } from '../constants';
import axios from 'axios';

export const getAssetsByOwner = async (
  walletAddress: string,
  page: number,
  limit: number,
): Promise<DAS.GetAssetResponse[]> => {
  const url = clusterHeliusApiUrl(process.env.HELIUS_API_KEY);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAssetsByOwner',
      params: { ownerAddress: walletAddress, page, limit },
    }),
  });
  const { result } = await response.json();
  return result.items;
};

export const getAssetsByGroup = async (
  collection: string,
  page: number,
  limit: number,
): Promise<DAS.GetAssetResponse[]> => {
  const url = clusterHeliusApiUrl(process.env.HELIUS_API_KEY);
  const params: DAS.AssetsByGroupRequest = {
    groupKey: 'collection',
    groupValue: collection,
    page,
    limit,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAssetsByGroup',
      params,
    }),
  });
  const { result } = await response.json();
  return result.items;
};

export const getAsset = async (id: string): Promise<DAS.GetAssetResponse> => {
  const url = clusterHeliusApiUrl(process.env.HELIUS_API_KEY);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAsset',
      params: {
        id,
      },
    }),
  });
  const { result } = await response.json();
  return result;
};

export function findOurCandyMachine(
  metaplex: Metaplex,
  candyMachines: { address: string }[],
  creators: DAS.Creators[],
) {
  const candyMachine = candyMachines.find(
    (cm) =>
      creators?.length > 0 &&
      metaplex
        .candyMachines()
        .pdas()
        .authority({ candyMachine: new PublicKey(cm.address) })
        .equals(new PublicKey(creators[0].address)),
  );
  return candyMachine?.address;
}

export async function doesWalletIndexCorrectly(
  mintAddress: string,
  metadataUri: string,
  updateAuthority: string,
  candyMachineAddress: string,
  collection: string,
  creators: { verified: boolean }[],
  nfts: string[],
) {
  for (const nft of nfts) {
    const doesNftExists = nft === mintAddress;
    if (doesNftExists) {
      const offChainMetadata = await fetchOffChainMetadata(metadataUri);
      const rarity = findRarityTrait(offChainMetadata);
      const authority = pda(
        [
          Buffer.from(AUTH_TAG + rarity.toLowerCase()),
          new PublicKey(candyMachineAddress).toBuffer(),
          new PublicKey(collection).toBuffer(),
        ],
        COMIC_VERSE_ID,
      );

      if (updateAuthority === authority.toString() && creators[1].verified) {
        return true;
      }
    }
  }
  return false;
}

export async function getAssetFromTensor() {
  const options = {
    method: 'GET',
    url: `${TENSOR_MAINNET_API_ENDPOINT}/api/v1/mint?mint=HkoBho4T5muGZicSDyntXKZCprT1RYxkWHeoHzRpET6e`,
    headers: {
      accept: 'application/json',
      'x-tensor-api-key': process.env.TENSOR_API_KEY,
    },
  };

  const response = await axios.request(options);
  return response.data;
}
