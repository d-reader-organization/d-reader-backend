import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { DAS } from 'helius-sdk';
import { fetchOffChainMetadata, findRarityTrait } from './nft-metadata';
import { AUTH_TAG, pda } from '../candy-machine/instructions/pda';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';
import { clusterHeliusApiUrl } from './helius';
import {
  TENSOR_GRAPHQL_API_ENDPOINT,
  TENSOR_MAINNET_API_ENDPOINT,
} from '../constants';
import axios, { AxiosError } from 'axios';
import { Cluster } from '../types/cluster';

export const getAssetsByOwner = async (
  walletAddress: string,
  page: number,
  limit: number,
): Promise<DAS.GetAssetResponse[]> => {
  const url = clusterHeliusApiUrl(
    process.env.HELIUS_API_KEY,
    process.env.SOLANA_CLUSTER === 'devnet'
      ? Cluster.Devnet
      : Cluster.MainnetBeta,
  );
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
  const url = clusterHeliusApiUrl(
    process.env.HELIUS_API_KEY,
    process.env.SOLANA_CLUSTER === 'devnet'
      ? Cluster.Devnet
      : Cluster.MainnetBeta,
  );
  console.log(url);
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
  const url = clusterHeliusApiUrl(
    process.env.HELIUS_API_KEY,
    process.env.SOLANA_CLUSTER === 'devnet'
      ? Cluster.Devnet
      : Cluster.MainnetBeta,
  );
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

export async function getAssetFromTensor(address: string) {
  const options = {
    method: 'GET',
    url: `${TENSOR_MAINNET_API_ENDPOINT}/api/v1/mint?mint=${address}`,
    headers: {
      accept: 'application/json',
      'x-tensor-api-key': process.env.TENSOR_API_KEY,
    },
  };

  const response = await axios.request(options);
  return response.data;
}

export async function fetchTensorBuyTx(
  buyer: string,
  maxPrice: number,
  mint: string,
  owner: string,
) {
  try {
    const { data } = await axios.post(
      TENSOR_GRAPHQL_API_ENDPOINT,
      {
        query: `query TcompBuyTx(
          $buyer: String!
          $maxPrice: Decimal!
          $mint: String!
          $owner: String!
        ) {
          tcompBuyTx(buyer: $buyer, maxPrice: $maxPrice, mint: $mint, owner: $owner) {
            txs {
              tx
              lastValidBlockHeight
            }
          }
        }`,
        variables: {
          buyer,
          maxPrice: maxPrice.toString(),
          mint,
          owner,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-TENSOR-API-KEY': process.env.TENSOR_API_KEY ?? '',
        },
      },
    );
    return data;
  } catch (err: any) {
    if (err instanceof AxiosError) console.log(err.response?.data.errors);
    else console.error(err);
  }
}
