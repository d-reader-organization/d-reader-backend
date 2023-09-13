import { PublicKey } from '@solana/web3.js';
import { getConnection } from './metaplex';
import { getAllDomains, reverseLookup } from '@bonfida/spl-name-service';

export async function getOwnerDomain(wallet: PublicKey): Promise<string> {
  const connection = getConnection();
  const domainKeys = await getAllDomains(connection, wallet);
  if (!domainKeys.length) return undefined;
  const domainName = await reverseLookup(connection, domainKeys[0]);
  return domainName;
}
