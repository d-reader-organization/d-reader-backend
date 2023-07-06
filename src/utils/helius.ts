import { Cluster } from '@solana/web3.js';

export function clusterHeliusApiUrl(
  apiKey: string,
  cluster: Cluster = 'devnet',
) {
  switch (cluster) {
    case 'devnet':
      return `http://devnet.helius-rpc.com/?api-key=${apiKey}`;
    case 'mainnet-beta':
      return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    default:
      return '';
  }
}
