import { Cluster } from '@solana/web3.js';

export function clusterHeliusApiUrl(
  apiKey: string,
  cluster: Cluster = 'devnet',
) {
  switch (cluster) {
    case 'devnet':
      return `https://rpc-devnet.helius.xyz/?api-key=${apiKey}`;
    case 'mainnet-beta':
      return `https://rpc.helius.xyz/?api-key=${apiKey}`;
    default:
      return '';
  }
}
