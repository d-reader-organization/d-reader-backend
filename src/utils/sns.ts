import { PublicKey } from '@solana/web3.js';
import { getConnection } from './metaplex';
import {
  getAllDomains,
  getFavoriteDomain,
  reverseLookup,
} from '@bonfida/spl-name-service';

export async function getOwnerDomain(wallet: PublicKey): Promise<string> {
  const connection = getConnection();
  let domain: {
    domain: PublicKey;
    reverse: string;
  };
  try {
    domain = await getFavoriteDomain(connection, wallet);
  } catch (e) {
    const domainKeys = await getAllDomains(connection, wallet);
    if (!domainKeys.length) return;
    return await reverseLookup(connection, domainKeys[0]);
  }
  return domain.reverse;
}
